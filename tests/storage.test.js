import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getLibrary,
  saveToLibrary,
  removeFromLibrary,
  isInLibrary,
  getFavorites,
  saveFavorites,
  addFavorite,
  removeFavorite,
  reorderFavorites,
  toggleFavoriteFeatured,
  verifyCreatorKey,
  hashKey,
  getMoments,
  saveMoment,
  removeMoment,
} from '../src/storage.js'

describe('Local Library storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves songs without duplicates', () => {
    const s1 = { id: 's1', title: 'Kesariya', artist: 'Arijit', cover: 'c1.jpg', src: 'u1.mp4' }
    const s2 = { id: 's2', title: 'Chaleya', artist: 'Arijit', cover: 'c2.jpg', src: 'u2.mp4' }

    expect(saveToLibrary(s1)).toBe(true)
    expect(saveToLibrary(s1)).toBe(false) // duplicate rejected
    expect(saveToLibrary(s2)).toBe(true)

    const lib = getLibrary()
    expect(lib).toHaveLength(2)
    expect(lib[0].id).toBe('s2') // latest first
    expect(lib[1].id).toBe('s1')
    expect(isInLibrary('s1')).toBe(true)
    expect(isInLibrary('s999')).toBe(false)
  })

  it('removes a song from library', () => {
    const s1 = { id: 's1', title: 'Song 1', artist: 'Artist 1' }
    saveToLibrary(s1)
    expect(getLibrary()).toHaveLength(1)

    expect(removeFromLibrary('s1')).toBe(true)
    expect(getLibrary()).toHaveLength(0)
    expect(isInLibrary('s1')).toBe(false)
  })
})

describe('Shrey\'s Favorites shared persistence & creator management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads seeded favorites when none in storage', () => {
    const favs = getFavorites()
    expect(favs.length).toBeGreaterThan(0)
    expect(favs[0]).toHaveProperty('id')
    expect(favs[0]).toHaveProperty('title')
  })

  it('adds a song to favorites with creator metadata', () => {
    const newSong = { id: 'fav-new', title: 'New Fav', artist: 'Artist X', cover: 'img.jpg' }
    const updated = addFavorite(newSong, 'Personal recommendation')
    expect(updated.some(f => f.id === 'fav-new')).toBe(true)
    const item = updated.find(f => f.id === 'fav-new')
    expect(item.description).toBe('Personal recommendation')
    expect(item.featured).toBe(false)
  })

  it('removes a song from favorites', () => {
    const favs = getFavorites()
    const targetId = favs[0].id
    const updated = removeFavorite(targetId)
    expect(updated.some(f => f.id === targetId)).toBe(false)
  })

  it('reorders favorites cleanly', () => {
    const favs = getFavorites()
    if (favs.length >= 2) {
      const firstId = favs[0].id
      const secondId = favs[1].id
      const reordered = reorderFavorites(0, 1)
      expect(reordered[0].id).toBe(secondId)
      expect(reordered[1].id).toBe(firstId)
    }
  })

  it('toggles featured flag on a favorite', () => {
    const favs = getFavorites()
    const id = favs[0].id
    const initial = favs[0].featured
    const updated = toggleFavoriteFeatured(id)
    const target = updated.find(f => f.id === id)
    expect(target.featured).toBe(!initial)
  })

  it('verifies creator key against SHA-256 hash', async () => {
    expect(await verifyCreatorKey('shrey815287299')).toBe(true)
    expect(await verifyCreatorKey('wrong-key')).toBe(false)
    expect(await verifyCreatorKey('shreycreator')).toBe(false)
    expect(await verifyCreatorKey('')).toBe(false)
  })
})

describe('Personal Moments and Selfie Archive', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts with an empty archive (blank state)', () => {
    expect(getMoments()).toEqual([])
  })

  it('saves a user selfie moment with song title and caption', () => {
    const saved = saveMoment({
      image: 'data:image/jpeg;base64,fakeimgdata',
      songTitle: 'Kesariya - Arijit Singh',
      caption: 'Golden sunset vibes at the beach.'
    })
    expect(saved).toBeTruthy()
    expect(saved.id).toContain('moment_')
    expect(saved.songTitle).toBe('Kesariya - Arijit Singh')
    expect(saved.caption).toBe('Golden sunset vibes at the beach.')

    const moments = getMoments()
    expect(moments).toHaveLength(1)
    expect(moments[0].id).toBe(saved.id)
  })

  it('removes a moment by id', () => {
    const m = saveMoment({
      image: 'data:image/jpeg;base64,fake',
      songTitle: 'Chaleya',
      caption: 'Dancing in the rain'
    })
    expect(getMoments()).toHaveLength(1)
    expect(removeMoment(m.id)).toBe(true)
    expect(getMoments()).toHaveLength(0)
  })

  it('rejects saving invalid moment without image', () => {
    expect(saveMoment(null)).toBe(false)
    expect(saveMoment({ image: '' })).toBe(false)
  })
})
