import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  APP_VERSION,
  APP_VERSION_CODE,
  isNewerVersion,
  checkForUpdate,
  getUpdateFeedUrl,
  setUpdateFeedUrl,
  dismissUpdate,
  getDismissedVersion,
} from '../src/updater'

describe('In-app Updater Service', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('correctly compares version codes and semantic versions', () => {
    // Current is versionCode 2, version "1.1.0"
    expect(isNewerVersion(3, '1.2.0')).toBe(true)
    expect(isNewerVersion(2, '1.1.1')).toBe(true)
    expect(isNewerVersion(1, '1.0.0')).toBe(false)
    expect(isNewerVersion(2, '1.1.0')).toBe(false)
  })

  it('manages update feed URL and dismissed version in storage', () => {
    expect(getUpdateFeedUrl()).toContain('version.json')
    setUpdateFeedUrl('https://example.com/custom-version.json')
    expect(getUpdateFeedUrl()).toBe('https://example.com/custom-version.json')

    expect(getDismissedVersion()).toBe(0)
    dismissUpdate(3)
    expect(getDismissedVersion()).toBe(3)
  })

  it('identifies new update from remote feed', async () => {
    const mockFeed = {
      version: '1.2.0',
      versionCode: 3,
      apkUrl: 'https://example.com/ShreyMusic-v1.2.0.apk',
      releaseNotes: 'Brand new audio equalizer and speed controls!',
      forceUpdate: false,
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFeed,
    }))

    const res = await checkForUpdate('https://example.com/version.json')
    expect(res.success).toBe(true)
    expect(res.hasUpdate).toBe(true)
    expect(res.latestVersion).toBe('1.2.0')
    expect(res.apkUrl).toBe('https://example.com/ShreyMusic-v1.2.0.apk')
  })

  it('returns hasUpdate = false when already on latest version', async () => {
    const mockFeed = {
      version: APP_VERSION,
      versionCode: APP_VERSION_CODE,
      apkUrl: 'https://example.com/ShreyMusic.apk',
    }

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockFeed,
    }))

    const res = await checkForUpdate('https://example.com/version.json')
    expect(res.success).toBe(true)
    expect(res.hasUpdate).toBe(false)
  })

  it('handles network failure gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))
    const res = await checkForUpdate('https://example.com/version.json')
    expect(res.success).toBe(false)
    expect(res.error).toContain('Network down')
  })
})
