import CryptoJS from 'crypto-js'

// Initial curated collection for Shrey's Favorites (used as seed and fallback)
export const SEED_FAVORITES = [
  {
    id: 'rjkrTnma',
    title: 'Kesariya',
    artist: 'Pritam, Arijit Singh',
    album: 'Brahmastra',
    cover: 'https://c.saavncdn.com/871/Brahmastra-Original-Motion-Picture-Soundtrack-Hindi-2022-20221006155213-500x500.jpg',
    duration: '4:28',
    description: 'The golden anthem. Melodic guitar intro and peak Arijit vocals.',
    featured: true,
    addedAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'I_Q4s_3-',
    title: 'Chaleya',
    artist: 'Anirudh Ravichander, Arijit Singh',
    album: 'Jawan',
    cover: 'https://c.saavncdn.com/026/Chaleya-From-Jawan-Hindi-2023-20230814114324-500x500.jpg',
    duration: '3:20',
    description: 'Effortless groove, signature Anirudh rhythm section.',
    featured: true,
    addedAt: '2026-10-05T00:00:00.000Z'
  },
  {
    id: 'c8pA7mP3',
    title: 'Tum Hi Ho',
    artist: 'Mithoon, Arijit Singh',
    album: 'Aashiqui 2',
    cover: 'https://c.saavncdn.com/152/Aashiqui-2-Hindi-2013-500x500.jpg',
    duration: '4:22',
    description: 'The track that defined a decade of Hindi ballads.',
    featured: false,
    addedAt: '2026-10-10T00:00:00.000Z'
  },
  {
    id: 'KGfDrbWe',
    title: 'Apna Bana Le',
    artist: 'Sachin-Jigar, Arijit Singh',
    album: 'Bhediya',
    cover: 'https://c.saavncdn.com/978/Bhediya-Hindi-2022-20221205161008-500x500.jpg',
    duration: '4:21',
    description: 'Soft acoustic masterpiece with soul-stirring lyrics.',
    featured: false,
    addedAt: '2026-10-15T00:00:00.000Z'
  }
]

const STORAGE_KEYS = {
  LIBRARY: 'shrey_music_library_v1',
  FAVORITES: 'shrey_music_favorites_v1',
  CREATOR_SESSION: 'shrey_music_creator_auth_v1',
  MOMENTS: 'shrey_music_moments_v1',
}

// Secure SHA-256 hash for creator authentication
const DEFAULT_CREATOR_KEY_HASH = '319aca37b7160b9d219faa9df1c0dd95aa2b45de452e86cb5d25b48cda38b333'

export async function hashKey(text) {
  if (!text) return ''
  return CryptoJS.SHA256(String(text).trim()).toString()
}

export async function verifyCreatorKey(inputKey) {
  if (!inputKey || typeof inputKey !== 'string') return false
  const hashed = await hashKey(inputKey)
  const target = (typeof window !== 'undefined' && window.__SHREY_CREATOR_HASH__) || DEFAULT_CREATOR_KEY_HASH
  return hashed === target
}

// ---------------------------------------------------------------------------
// Personal Library (device-specific, persistent)
// ---------------------------------------------------------------------------
export function getLibrary() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEYS.LIBRARY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.warn('Failed to read library from localStorage:', err)
    return []
  }
}

export function saveToLibrary(song) {
  if (!song || !song.id) return false
  try {
    const list = getLibrary()
    // Avoid duplicate entries
    if (list.some(item => item.id === song.id)) {
      return false
    }
    const safeSong = {
      id: song.id,
      title: song.title || 'Untitled',
      artist: song.artist || 'Unknown Artist',
      album: song.album || '',
      cover: song.cover || '/images/cover-01.svg',
      duration: song.duration || '',
      src: song.src || '',
      savedAt: new Date().toISOString()
    }
    const updated = [safeSong, ...list]
    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(updated))
    return true
  } catch (err) {
    console.warn('Failed to save to library:', err)
    return false
  }
}

export function removeFromLibrary(songId) {
  if (!songId) return false
  try {
    const list = getLibrary()
    const updated = list.filter(item => item.id !== songId)
    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(updated))
    return true
  } catch (err) {
    console.warn('Failed to remove from library:', err)
    return false
  }
}

export function isInLibrary(songId) {
  if (!songId) return false
  const list = getLibrary()
  return list.some(item => item.id === songId)
}

// ---------------------------------------------------------------------------
// Shrey's Favorites (Shared collection + Creator modifications)
// ---------------------------------------------------------------------------
export const REMOTE_FAVORITES_URL = 'https://raw.githubusercontent.com/shrey4elan/shreymusic/master/public/favorites.json'
const GITHUB_REPO = 'shrey4elan/shreymusic'
const GITHUB_FILE_PATH = 'public/favorites.json'

export async function fetchRemoteFavorites(url = REMOTE_FAVORITES_URL) {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (res && res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        saveFavorites(data)
        return data
      }
    }
  } catch (err) {
    console.warn('Could not fetch remote favorites, using local cache:', err)
  }
  return getFavorites()
}

export function getSavedCreatorToken() {
  try {
    if (typeof localStorage === 'undefined') return ''
    return localStorage.getItem('shrey_creator_github_token') || ''
  } catch {
    return ''
  }
}

export function saveCreatorToken(token) {
  try {
    if (typeof localStorage === 'undefined') return
    if (!token) {
      localStorage.removeItem('shrey_creator_github_token')
    } else {
      localStorage.setItem('shrey_creator_github_token', token.trim())
    }
  } catch {}
}

export async function publishFavoritesToCloud(token, favoritesList) {
  if (!token || !token.trim()) {
    return { success: false, error: 'GitHub Personal Access Token is required to publish to everyone' }
  }
  const cleanToken = token.trim()
  saveCreatorToken(cleanToken)

  try {
    // 1. Get current file sha from GitHub
    const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ShreyMusicApp'
      }
    })

    let sha = null
    if (getRes.ok) {
      const existing = await getRes.json()
      sha = existing.sha
    }

    // 2. Encode updated content to Base64 (supporting unicode)
    const jsonStr = JSON.stringify(favoritesList, null, 2)
    const base64Content = btoa(unescape(encodeURIComponent(jsonStr)))

    // 3. Commit updated favorites.json directly to GitHub
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ShreyMusicApp'
      },
      body: JSON.stringify({
        message: 'chore: update Shrey\'s Favorites collection',
        content: base64Content,
        sha: sha || undefined
      })
    })

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}))
      return {
        success: false,
        error: errData.message || `GitHub error: HTTP ${putRes.status}`
      }
    }

    // Also update local cache
    saveFavorites(favoritesList)
    return { success: true }
  } catch (err) {
    return { success: false, error: err?.message || 'Network error publishing to cloud' }
  }
}

export function getFavorites() {
  try {
    if (typeof localStorage === 'undefined') return SEED_FAVORITES
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES)
    if (!raw) {
      // Seed default favorites on first launch
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(SEED_FAVORITES))
      return SEED_FAVORITES
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_FAVORITES
  } catch (err) {
    console.warn('Failed to load favorites, using fallback seed:', err)
    return SEED_FAVORITES
  }
}

export function saveFavorites(favoritesList) {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoritesList))
    return true
  } catch (err) {
    console.warn('Failed to save favorites:', err)
    return false
  }
}

export function addFavorite(song, description = '') {
  if (!song || !song.id) return getFavorites()
  const list = getFavorites()
  const exists = list.some(f => f.id === song.id)
  if (exists) return list

  const newFav = {
    id: song.id,
    title: song.title || 'Untitled',
    artist: song.artist || 'Unknown Artist',
    album: song.album || '',
    cover: song.cover || '/images/cover-01.svg',
    duration: song.duration || '',
    src: song.src || '',
    description: description.trim(),
    featured: false,
    addedAt: new Date().toISOString()
  }

  const updated = [newFav, ...list]
  saveFavorites(updated)
  return updated
}

export function removeFavorite(songId) {
  if (!songId) return getFavorites()
  const list = getFavorites()
  const updated = list.filter(f => f.id !== songId)
  saveFavorites(updated)
  return updated
}

export function reorderFavorites(fromIndex, toIndex) {
  const list = [...getFavorites()]
  if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
    return list
  }
  const [moved] = list.splice(fromIndex, 1)
  list.splice(toIndex, 0, moved)
  saveFavorites(list)
  return list
}

export function toggleFavoriteFeatured(songId) {
  const list = getFavorites().map(f => {
    if (f.id === songId) {
      return { ...f, featured: !f.featured }
    }
    return f
  })
  saveFavorites(list)
  return list
}

// ---------------------------------------------------------------------------
// Personal Moments & Selfies (User-created Visual Archive)
// ---------------------------------------------------------------------------
export function getMoments() {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(STORAGE_KEYS.MOMENTS)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.warn('Failed to load moments:', err)
    return []
  }
}

export function saveMoment(moment) {
  if (!moment || !moment.image) return false
  try {
    const list = getMoments()
    const item = {
      id: moment.id || 'moment_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      image: moment.image,
      songTitle: (moment.songTitle || 'Soundtrack').trim(),
      caption: (moment.caption || '').trim(),
      ratio: moment.ratio || '4/3',
      createdAt: moment.createdAt || new Date().toISOString()
    }
    const updated = [item, ...list]
    localStorage.setItem(STORAGE_KEYS.MOMENTS, JSON.stringify(updated))
    return item
  } catch (err) {
    console.warn('Failed to save moment:', err)
    return false
  }
}

export function removeMoment(momentId) {
  if (!momentId) return false
  try {
    const list = getMoments()
    const updated = list.filter(m => m.id !== momentId)
    localStorage.setItem(STORAGE_KEYS.MOMENTS, JSON.stringify(updated))
    return true
  } catch (err) {
    console.warn('Failed to remove moment:', err)
    return false
  }
}
