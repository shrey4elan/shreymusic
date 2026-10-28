import CryptoJS from 'crypto-js'

const DES_KEY = '38346591'

// Decrypts JioSaavn's encrypted_media_url to get direct stream link
export function decryptUrl(encrypted) {
  if (!encrypted) return null
  try {
    const keyHex = CryptoJS.enc.Utf8.parse(DES_KEY)
    const ciphertext = CryptoJS.enc.Base64.parse(encrypted)
    const decrypted = CryptoJS.DES.decrypt({ ciphertext }, keyHex, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8)

    if (!decrypted) return null
    // Prefer 320kbps or 160kbps high quality if available, falling back to 96kbps
    return decrypted.replace(/_96\.mp4/, '_320.mp4')
  } catch (err) {
    console.error('Failed to decrypt JioSaavn URL:', err)
    return null
  }
}

const ENTITY_MAP = {
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#039;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
}

// Unescape HTML entities like &quot;, &amp;
export function cleanString(str) {
  if (!str) return ''
  return String(str)
    .replace(/&(quot|amp|lt|gt|#039|apos|nbsp);/g, match => ENTITY_MAP[match] || match)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
}

// In-memory cache for search queries to avoid duplicate network calls
const searchCache = new Map()
const MAX_CACHE_ENTRIES = 60

export function clearSearchCache() {
  searchCache.clear()
}

// Search songs on JioSaavn using local Vite proxy with direct/CORS fallback
export async function searchSongs(query, { signal, limit = 25, cache = false } = {}) {
  if (!query || !query.trim()) return []
  const cleanQ = query.trim()
  const cacheKey = `${cleanQ.toLowerCase()}_${limit}`

  if (cache && searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)
  }

  const params = `?__call=search.getResults&q=${encodeURIComponent(cleanQ)}&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}`

  let data = null
  // 1. Try Vite local/preview proxy (/jio-api)
  try {
    const res = await fetch(`/jio-api${params}`, { signal })
    if (res && res.ok) {
      data = await res.json()
    }
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Vite proxy not active or external environment
  }

  // 2. Fallback to hosted Saavn API (CORS-enabled, reliable)
  if (!data || !Array.isArray(data.results)) {
    try {
      const res = await fetch(`https://jiosaavn-eta.vercel.app/search/songs?query=${encodeURIComponent(cleanQ)}`, { signal })
      if (res && res.ok) {
        const j = await res.json()
        const raw = j?.data?.results || []
        // Normalize hosted-API shape to the raw JioSaavn shape the mapper expects
        data = {
          results: raw.map(r => ({
            id: r.id,
            title: r.name,
            image: r.image?.findLast?.(u => u.quality !== '12x12')?.link || r.image,
            subtitle: r.primaryArtists || r.subtitle,
            more_info: {
              encrypted_media_url: r.downloadUrl?.findLast?.(u => u.quality === '320kbps')?.link || r.downloadUrl?.[0]?.link || r.downloadUrl,
              duration: r.duration,
              album: r.album?.name,
              artistMap: { primary_artists: r.primaryArtists ? [{ name: r.primaryArtists }] : [] },
              singers: r.singers,
            },
          })),
        }
      }
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      console.warn('Hosted API fallback failed:', err)
    }
  }

  // 3. Last resort: CORS proxies to the raw JioSaavn API
  if (!data || !Array.isArray(data.results)) {
    const fullUrl = `https://www.jiosaavn.com/api.php${params}`
    for (const proxy of [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(fullUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(fullUrl)}`,
    ]) {
      try {
        const res = await fetch(proxy, { signal })
        if (res && res.ok) {
          const parsed = await res.json()
          if (parsed && Array.isArray(parsed.results)) {
            data = parsed
            break
          }
        }
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        console.warn('CORS proxy failed:', err)
      }
    }
  }

  const list = Array.isArray(data?.results) ? data.results : []
  const parsedSongs = list.map(item => {
    const enc = item.more_info?.encrypted_media_url
    // The hosted fallback API already returns plain URLs (aac.saavncdn.com/..._320.mp4);
    // only run real encrypted payloads through DES decryption.
    const directUrl = enc && enc.startsWith('https://') && /_\d+\.mp4/.test(enc) ? enc : decryptUrl(enc)
    
    // Choose highest available cover art
    let cover = item.image || ''
    if (Array.isArray(cover)) {
      cover = (cover.findLast(u => u?.quality !== '12x12') || cover[0])?.link || ''
    }
    if (cover) {
      cover = String(cover).replace(/150x150/, '500x500')
    }

    const durationSec = parseInt(item.more_info?.duration || '0', 10)
    const durationFmt = durationSec > 0
      ? `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`
      : ''

    const artistName = cleanString(
      item.more_info?.artistMap?.primary_artists?.[0]?.name ||
      item.subtitle ||
      item.more_info?.singers ||
      'Unknown Artist'
    )

    return {
      id: item.id,
      title: cleanString(item.title),
      artist: artistName,
      album: cleanString(item.more_info?.album || ''),
      cover: cover || '/images/cover-01.svg',
      src: directUrl,
      duration: durationFmt
    }
  }).filter(song => !!song.src)

  // Store in LRU-style cache when caching is enabled
  if (cache && parsedSongs.length > 0) {
    if (searchCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = searchCache.keys().next().value
      searchCache.delete(oldest)
    }
    searchCache.set(cacheKey, parsedSongs)
  }

  return parsedSongs
}

// Fetch trending / recommended tracks for home dashboard
export async function getTrendingSongs() {
  return searchSongs('Top Hindi Trending')
}

// Resolves a fresh stream URL for a song ID if the cached one expired or is missing
export async function resolveSongUrl(song) {
  if (!song) return null
  if (song.src && !song.isExpired) return song.src

  // 1. Try hosted Saavn API for individual song metadata
  if (song.id) {
    try {
      const res = await fetch(`https://jiosaavn-eta.vercel.app/songs?id=${encodeURIComponent(song.id)}`)
      if (res && res.ok) {
        const json = await res.json()
        const track = json?.data?.[0]
        const dl = track?.downloadUrl
        const freshUrl = Array.isArray(dl)
          ? dl.findLast?.(u => u.quality === '320kbps')?.link || dl[dl.length - 1]?.link
          : (dl || '')
        if (freshUrl) return freshUrl
      }
    } catch {
      // fallback
    }

    // 2. Try JioSaavn details API via local Vite proxy
    try {
      const params = `?__call=song.getDetails&pids=${encodeURIComponent(song.id)}&_format=json&_marker=0&api_version=4&ctx=web6dot0`
      const res = await fetch(`/jio-api${params}`)
      if (res && res.ok) {
        const details = await res.json()
        const songData = details?.[song.id]
        if (songData?.encrypted_media_url) {
          const decrypted = decryptUrl(songData.encrypted_media_url)
          if (decrypted) return decrypted
        }
      }
    } catch {
      // fallback
    }
  }

  // 3. Fallback: search by song title and artist
  if (song.title) {
    const q = `${song.title} ${song.artist || ''}`.trim()
    const matches = await searchSongs(q, { limit: 5 })
    if (matches && matches.length > 0) {
      return matches[0].src
    }
  }

  return song.src || null
}

