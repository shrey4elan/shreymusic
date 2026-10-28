import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import CryptoJS from 'crypto-js'
import { decryptUrl, searchSongs, getTrendingSongs } from '../src/saavn'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DES_KEY = '38346591'

/** Encrypt a plain URL the same way JioSaavn does, so decryptUrl can round-trip it. */
function encryptUrl(plain) {
  const keyHex = CryptoJS.enc.Utf8.parse(DES_KEY)
  return CryptoJS.DES.encrypt(plain, keyHex, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7,
  }).ciphertext.toString(CryptoJS.enc.Base64)
}

/** Build a fake JioSaavn API song item. */
function fakeItem(overrides = {}) {
  return {
    id: 'song-1',
    title: 'Tum Hi Ho',
    image: 'https://example.com/150x150/art.jpg',
    subtitle: 'Arijit Singh',
    more_info: {
      encrypted_media_url: encryptUrl('https://aac.saavncdn.com/abc_96.mp4'),
      duration: '262',
      album: 'Aashiqui 2',
      artistMap: { primary_artists: [{ name: 'Arijit Singh' }] },
    },
    ...overrides,
  }
}

/** Standard successful proxy JSON response. */
function fakeResponse(items = [fakeItem()]) {
  return {
    ok: true,
    json: async () => ({ results: items }),
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

/** Fake response in the shape returned by the hosted Saavn API fallback. */
function hostedResponse(items = [{
  id: 'song-1',
  name: 'Tum Hi Ho',
  primaryArtists: 'Arijit Singh',
  image: [{ quality: '500x500', link: 'https://example.com/500x500/art.jpg' }],
  downloadUrl: [{ quality: '320kbps', link: 'https://aac.saavncdn.com/x_320.mp4' }],
  duration: '262',
  album: { name: 'Aashiqui 2' },
}]) {
  return {
    ok: true,
    json: async () => ({ data: { results: items } }),
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// decryptUrl
// ---------------------------------------------------------------------------

describe('decryptUrl', () => {
  it('decrypts a valid encrypted URL and upgrades 96kbps to 320kbps', () => {
    const enc = encryptUrl('https://aac.saavncdn.com/track_96.mp4')
    expect(decryptUrl(enc)).toBe('https://aac.saavncdn.com/track_320.mp4')
  })

  it('round-trips a URL that has no _96.mp4 segment unchanged', () => {
    const plain = 'https://aac.saavncdn.com/track_320.mp4'
    expect(decryptUrl(encryptUrl(plain))).toBe(plain)
  })

  it('returns null for empty string, null, undefined', () => {
    expect(decryptUrl('')).toBeNull()
    expect(decryptUrl(null)).toBeNull()
    expect(decryptUrl(undefined)).toBeNull()
  })

  it('returns null for invalid base64 (throws inside CryptoJS and is caught)', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => { })
    // Random 8 bytes of base64 that are not valid Pkcs7 ciphertext for the key
    expect(decryptUrl(CryptoJS.enc.Base64.parse('AAAAAAAAAAA=').toString(CryptoJS.enc.Base64) === 'AAAAAAAAAAA=' ? 'AAAAAAAAAAA=' : 'AAAAAAAAAAA=')).toBeNull()
    errSpy.mockRestore()
  })

  it('returns null for garbage text that is not valid ciphertext', () => {
    vi.spyOn(console, 'error').mockImplementation(() => { })
    expect(decryptUrl('not-a-valid-url')).toBeNull()
  })

  it('never throws — always returns a string or null', () => {
    vi.spyOn(console, 'error').mockImplementation(() => { })
    for (const bad of ['', '   ', '!!!', '😀', 'AAAAAAAAAAA=']) {
      expect([null, expect.any(String)]).toContainEqual(decryptUrl(bad))
    }
  })
})

// ---------------------------------------------------------------------------
// searchSongs — guard clauses
// ---------------------------------------------------------------------------

describe('searchSongs — input validation', () => {
  it('returns [] and does not call fetch for empty query', async () => {
    expect(await searchSongs('')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns [] for whitespace-only query', async () => {
    expect(await searchSongs('   ')).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns [] for null / undefined query', async () => {
    expect(await searchSongs(null)).toEqual([])
    expect(await searchSongs(undefined)).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('trims surrounding whitespace from the query', async () => {
    fetch.mockResolvedValueOnce(fakeResponse())
    await searchSongs('  Arijit  ')
    const url = fetch.mock.calls[0][0]
    expect(url).toContain(encodeURIComponent('Arijit'))
    expect(url).not.toContain(encodeURIComponent('  Arijit  '))
  })
})

// ---------------------------------------------------------------------------
// searchSongs — primary proxy (/jio-api)
// ---------------------------------------------------------------------------

describe('searchSongs — Vite proxy path', () => {
  it('calls /jio-api with correct encoded params', async () => {
    fetch.mockResolvedValueOnce(fakeResponse())
    await searchSongs('Tum Se Hi')
    const [url] = fetch.mock.calls[0]
    expect(url).toContain('/jio-api?__call=search.getResults&q=')
    expect(url).toContain('_format=json&_marker=0&api_version=4&ctx=web6dot0&n=25')
    expect(url).toContain(encodeURIComponent('Tum Se Hi'))
  })

  it('maps a full song object with decrypted URL and 320kbps upgrade', async () => {
    const enc = encryptUrl('https://aac.saavncdn.com/x_96.mp4')
    fetch.mockReset()
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ more_info: { ...fakeItem().more_info, encrypted_media_url: enc } }),
    ]))
    const songs = await searchSongs('test')
    expect(songs).toEqual([
      expect.objectContaining({
        id: 'song-1',
        title: 'Tum Hi Ho',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        src: 'https://aac.saavncdn.com/x_320.mp4',
        duration: '4:22',
        cover: 'https://example.com/500x500/art.jpg',
      }),
    ])
  })

  it('filters out songs whose encrypted URL cannot be decrypted', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ more_info: { ...fakeItem().more_info, encrypted_media_url: 'garbage' } }),
      fakeItem({ id: 'song-2' }),
    ]))
    const songs = await searchSongs('test')
    expect(songs).toHaveLength(1)
    expect(songs[0].id).toBe('song-2')
  })

  it('tries every fallback when the primary responds with 500', async () => {
    // Primary fails, hosted API fails, both CORS proxies fail -> results []
    fetch.mockResolvedValue({ ok: false, json: async () => ({}) })
    const songs = await searchSongs('test')
    expect(songs).toEqual([])
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('skips the fallback proxy when primary succeeds', async () => {
    fetch.mockResolvedValueOnce(fakeResponse())
    await searchSongs('ok')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toContain('/jio-api')
  })
})

// ---------------------------------------------------------------------------
// searchSongs — AllOrigins fallback
// ---------------------------------------------------------------------------

describe('searchSongs — AllOrigins fallback', () => {
  it('falls back to the hosted API when primary returns non-JSON / throws', async () => {
    fetch.mockRejectedValueOnce(new Error('proxy down'))
    fetch.mockResolvedValueOnce(hostedResponse())
    const songs = await searchSongs('test')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(songs).toHaveLength(1)
    expect(fetch.mock.calls[1][0]).toContain('https://jiosaavn-eta.vercel.app/search/songs')
  })

  it('falls back when primary returns ok but empty body', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) })
    fetch.mockResolvedValueOnce(hostedResponse())
    const songs = await searchSongs('test')
    expect(songs).toHaveLength(1)
  })

  it('falls back when primary returns ok but no results key', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ foo: 1 }) })
    fetch.mockResolvedValueOnce(hostedResponse())
    const songs = await searchSongs('test')
    expect(songs).toHaveLength(1)
  })

  it('returns [] when both proxies fail', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => { })
    fetch.mockRejectedValueOnce(new Error('primary down'))
    fetch.mockRejectedValueOnce(new Error('fallback down'))
    const songs = await searchSongs('test')
    expect(songs).toEqual([])
    expect(warn).toHaveBeenCalled()
  })

  it('falls back when primary returns malformed JSON (json() throws)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new Error('bad json') } })
    fetch.mockResolvedValueOnce(hostedResponse())
    const songs = await searchSongs('test')
    expect(songs).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// searchSongs — field mapping / edge cases
// ---------------------------------------------------------------------------

describe('searchSongs — field mapping', () => {
  it('uses fallback artist chain: subtitle -> singers -> Unknown Artist', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ subtitle: 'From Subtitle', more_info: { ...fakeItem().more_info, artistMap: { primary_artists: [] } } }),
      fakeItem({ id: '2', subtitle: '', more_info: { ...fakeItem().more_info, artistMap: { primary_artists: [] }, singers: 'Shreya Ghoshal' } }),
      fakeItem({ id: '3', subtitle: '', more_info: { ...fakeItem().more_info, artistMap: { primary_artists: [] } } }),
    ]))
    const songs = await searchSongs('test')
    expect(songs.map(s => s.artist)).toEqual(['From Subtitle', 'Shreya Ghoshal', 'Unknown Artist'])
  })

  it('unescapes HTML entities in title and album', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ title: 'Kesariya &quot;Brahmastra&quot;', more_info: { ...fakeItem().more_info, album: 'Amp &amp; Sons' } }),
    ]))
    const [song] = await searchSongs('test')
    expect(song.title).toBe('Kesariya "Brahmastra"')
    expect(song.album).toBe('Amp & Sons')
  })

  it('formats duration 0 or missing as empty string', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ more_info: { ...fakeItem().more_info, duration: '0' } }),
      fakeItem({ id: '2', more_info: { ...fakeItem().more_info, duration: undefined } }),
    ]))
    const songs = await searchSongs('test')
    expect(songs.map(s => s.duration)).toEqual(['', ''])
  })

  it('pads seconds under 10 (e.g. 65s -> 1:05)', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ more_info: { ...fakeItem().more_info, duration: '65' } }),
    ]))
    const [song] = await searchSongs('test')
    expect(song.duration).toBe('1:05')
  })

  it('formats duration >= 10 minutes correctly', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ more_info: { ...fakeItem().more_info, duration: '635' } }),
    ]))
    const [song] = await searchSongs('test')
    expect(song.duration).toBe('10:35')
  })

  it('upgrades cover art 150x150 to 500x500', async () => {
    fetch.mockResolvedValueOnce(fakeResponse())
    const [song] = await searchSongs('test')
    expect(song.cover).toContain('500x500')
  })

  it('falls back to default cover when image missing or empty', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ image: undefined }),
      fakeItem({ id: '2', image: '' }),
    ]))
    const songs = await searchSongs('test')
    expect(songs.every(s => s.cover === '/images/cover-01.svg')).toBe(true)
  })

  it('handles missing more_info object entirely (falls back gracefully)', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([
      fakeItem({ more_info: undefined }),
    ]))
    const songs = await searchSongs('test')
    // encrypted_media_url is undefined -> decryptUrl returns null -> song filtered out
    expect(songs).toEqual([])
  })

  it('returns [] for empty results list', async () => {
    fetch.mockResolvedValueOnce(fakeResponse([]))
    expect(await searchSongs('nothing here')).toEqual([])
  })

  it('returns [] when data.results is not an array (e.g. object)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: null }) })
    expect(await searchSongs('test')).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getTrendingSongs
// ---------------------------------------------------------------------------

describe('getTrendingSongs', () => {
  it('delegates to searchSongs with trending query', async () => {
    fetch.mockResolvedValueOnce(fakeResponse())
    const songs = await getTrendingSongs()
    expect(songs).toHaveLength(1)
    expect(fetch.mock.calls[0][0]).toContain(encodeURIComponent('Top Hindi Trending'))
  })
})
