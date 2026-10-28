// In-app updater for Shrey Music
export const APP_VERSION = '1.1.0'
export const APP_VERSION_CODE = 2

const STORAGE_KEYS = {
  UPDATE_FEED_URL: 'shrey_music_update_feed_url',
  DISMISSED_VERSION: 'shrey_music_dismissed_update_version',
}

// Fallback / default feed endpoint (hosted on user GitHub repo)
export const DEFAULT_UPDATE_FEED = 'https://raw.githubusercontent.com/shrey4elan/shreymusic/master/public/version.json'

export function getUpdateFeedUrl() {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_UPDATE_FEED
    return localStorage.getItem(STORAGE_KEYS.UPDATE_FEED_URL) || DEFAULT_UPDATE_FEED
  } catch {
    return DEFAULT_UPDATE_FEED
  }
}

export function setUpdateFeedUrl(url) {
  try {
    if (typeof localStorage === 'undefined') return
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEYS.UPDATE_FEED_URL)
    } else {
      localStorage.setItem(STORAGE_KEYS.UPDATE_FEED_URL, url.trim())
    }
  } catch (err) {
    console.warn('Failed to save update feed URL:', err)
  }
}

export function getDismissedVersion() {
  try {
    if (typeof localStorage === 'undefined') return 0
    return parseInt(localStorage.getItem(STORAGE_KEYS.DISMISSED_VERSION) || '0', 10)
  } catch {
    return 0
  }
}

export function dismissUpdate(versionCode) {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEYS.DISMISSED_VERSION, String(versionCode))
  } catch (err) {
    console.warn('Failed to save dismissed version:', err)
  }
}

// Compares semantic versions or version codes
export function isNewerVersion(remoteVersionCode, remoteVersionStr) {
  if (typeof remoteVersionCode === 'number' && remoteVersionCode > APP_VERSION_CODE) {
    return true
  }
  if (!remoteVersionStr) return false
  const curParts = APP_VERSION.split('.').map(Number)
  const remParts = remoteVersionStr.split('.').map(Number)
  for (let i = 0; i < Math.max(curParts.length, remParts.length); i++) {
    const c = curParts[i] || 0
    const r = remParts[i] || 0
    if (r > c) return true
    if (r < c) return false
  }
  return false
}

// Checks remote update feed for new versions
export async function checkForUpdate(feedUrl = getUpdateFeedUrl()) {
  try {
    const res = await fetch(feedUrl, { cache: 'no-store' })
    if (!res || !res.ok) {
      return { success: false, error: 'Could not contact update server' }
    }
    const data = await res.json()
    if (!data) {
      return { success: false, error: 'Malformed update response' }
    }

    const hasNew = isNewerVersion(data.versionCode, data.version)
    return {
      success: true,
      hasUpdate: hasNew,
      currentVersion: APP_VERSION,
      currentVersionCode: APP_VERSION_CODE,
      latestVersion: data.version || APP_VERSION,
      latestVersionCode: data.versionCode || APP_VERSION_CODE,
      apkUrl: data.apkUrl || '',
      releaseNotes: data.releaseNotes || 'Bug fixes and performance improvements.',
      forceUpdate: !!data.forceUpdate,
    }
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Network error while checking for updates'
    }
  }
}
