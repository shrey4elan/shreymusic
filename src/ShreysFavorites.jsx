import { useState, useEffect, useRef } from 'react'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  reorderFavorites,
  toggleFavoriteFeatured,
  verifyCreatorKey,
  saveToLibrary,
  removeFromLibrary,
  isInLibrary
} from './storage'
import { searchSongs, resolveSongUrl } from './saavn'

export default function ShreysFavorites({ currentTrack, isPlaying, onPlaySong }) {
  const [favorites, setFavorites] = useState([])
  const [isCreator, setIsCreator] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keyError, setKeyError] = useState('')
  const [loadingTrackId, setLoadingTrackId] = useState(null)

  // Creator Search State
  const [creatorQuery, setCreatorQuery] = useState('')
  const [creatorSearching, setCreatorSearching] = useState(false)
  const [creatorResults, setCreatorResults] = useState([])
  const [selectedToAdd, setSelectedToAdd] = useState(null)
  const [recommendationNote, setRecommendationNote] = useState('')
  const [previewAudio, setPreviewAudio] = useState(null)
  const [previewingId, setPreviewingId] = useState(null)

  const searchTimer = useRef(null)

  const reload = () => {
    setFavorites(getFavorites())
  }

  useEffect(() => {
    reload()
    window.addEventListener('storage', reload)
    // Check if session had creator auth
    if (sessionStorage.getItem('shrey_creator_auth') === 'true') {
      setIsCreator(true)
    }
    return () => {
      window.removeEventListener('storage', reload)
      if (previewAudio) {
        previewAudio.pause()
      }
    }
  }, [])

  // Creator Key Verification
  const handleKeySubmit = async (e) => {
    e.preventDefault()
    setKeyError('')
    const valid = await verifyCreatorKey(keyInput)
    if (valid) {
      setIsCreator(true)
      sessionStorage.setItem('shrey_creator_auth', 'true')
      setShowKeyModal(false)
      setKeyInput('')
    } else {
      setKeyError('Invalid Creator Key. Please try again.')
    }
  }

  const handleLogoutCreator = () => {
    setIsCreator(false)
    sessionStorage.removeItem('shrey_creator_auth')
    setSelectedToAdd(null)
  }

  // Consumer Play Song with dynamic URL renewal
  const handlePlay = async (song) => {
    if (loadingTrackId) return
    setLoadingTrackId(song.id)
    try {
      const streamUrl = await resolveSongUrl(song)
      if (streamUrl) {
        onPlaySong({ ...song, src: streamUrl })
      } else {
        alert('Could not retrieve audio stream. Please try another track.')
      }
    } catch (err) {
      console.warn('Playback error:', err)
      onPlaySong(song)
    } finally {
      setLoadingTrackId(null)
    }
  }

  // Consumer Library Toggle
  const handleToggleLibrary = (e, song) => {
    e.stopPropagation()
    if (isInLibrary(song.id)) {
      removeFromLibrary(song.id)
    } else {
      saveToLibrary(song)
    }
    // Force re-render
    setFavorites([...getFavorites()])
  }

  // Creator Song Search with JioSaavn
  const handleCreatorSearchChange = (e) => {
    const q = e.target.value
    setCreatorQuery(q)
    clearTimeout(searchTimer.current)
    if (!q.trim()) {
      setCreatorResults([])
      setCreatorSearching(false)
      return
    }
    setCreatorSearching(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchSongs(q, { limit: 12, cache: true })
        setCreatorResults(results)
      } catch (err) {
        console.warn('Creator search error:', err)
      } finally {
        setCreatorSearching(false)
      }
    }, 400)
  }

  // Preview track inside creator panel
  const togglePreview = (song) => {
    if (previewingId === song.id && previewAudio) {
      previewAudio.pause()
      setPreviewingId(null)
      return
    }
    if (previewAudio) {
      previewAudio.pause()
    }
    if (song.src) {
      const a = new Audio(song.src)
      a.play().catch(() => {})
      setPreviewAudio(a)
      setPreviewingId(song.id)
      a.onended = () => setPreviewingId(null)
    }
  }

  // Add song to Shrey's Favorites
  const handleAddSong = (song) => {
    addFavorite(song, recommendationNote)
    reload()
    setSelectedToAdd(null)
    setRecommendationNote('')
    setCreatorQuery('')
    setCreatorResults([])
  }

  // Reorder
  const handleMove = (index, direction) => {
    const to = index + direction
    if (to < 0 || to >= favorites.length) return
    const updated = reorderFavorites(index, to)
    setFavorites(updated)
  }

  // Toggle Featured
  const handleToggleFeatured = (id) => {
    const updated = toggleFavoriteFeatured(id)
    setFavorites(updated)
  }

  // Remove
  const handleRemoveFavorite = (id) => {
    if (confirm('Remove this track from Shrey\'s Favorites?')) {
      const updated = removeFavorite(id)
      setFavorites(updated)
    }
  }

  return (
    <section className="echo-favorites-view">
      {/* Header */}
      <div className="echo-view-header">
        <div className="echo-view-title-wrap">
          <span className="echo-view-kicker">CURATED SELECTION</span>
          <h2 className="echo-view-title">Shrey's Favorites</h2>
          <p className="echo-view-sub">
            A hand-picked collection of songs curated and recommended by Shrey. Enjoy the golden picks with personal notes!
          </p>
        </div>
        <div className="echo-view-actions">
          <span className="echo-count-badge">⭐ {favorites.length} Picks</span>
          {!isCreator ? (
            <button
              className="echo-creator-pill hov"
              onClick={() => setShowKeyModal(true)}
              title="Creator Management"
            >
              🔒 Creator Mode
            </button>
          ) : (
            <button
              className="echo-creator-pill active hov"
              onClick={handleLogoutCreator}
              title="Exit Creator Mode"
            >
              👑 Creator Active (Exit)
            </button>
          )}
        </div>
      </div>

      {/* Creator Management Studio Panel */}
      {isCreator && (
        <div className="creator-studio-panel">
          <div className="creator-studio-header">
            <div>
              <h3>👑 Creator Studio: Manage Collection</h3>
              <p>Search JioSaavn library, preview tracks, and publish songs with your personal recommendations.</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="creator-search-box">
            <span className="creator-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search JioSaavn songs to add to Shrey's Favorites..."
              value={creatorQuery}
              onChange={handleCreatorSearchChange}
              className="echo-search-input hov"
            />
            {creatorSearching && <span className="creator-spinner">Searching...</span>}
          </div>

          {/* Search Results */}
          {creatorResults.length > 0 && (
            <div className="creator-results-list">
              <h4>Search Results ({creatorResults.length})</h4>
              <div className="creator-results-scroll">
                {creatorResults.map((song) => {
                  const alreadyInFav = favorites.some((f) => f.id === song.id)
                  const isPreviewing = previewingId === song.id

                  return (
                    <div key={song.id} className="creator-result-row">
                      <img src={song.cover} alt="" className="creator-result-art" />
                      <div className="creator-result-meta">
                        <b>{song.title}</b>
                        <span>{song.artist} • {song.duration}</span>
                      </div>
                      <div className="creator-result-actions">
                        <button
                          type="button"
                          className="echo-action-pill hov"
                          onClick={() => togglePreview(song)}
                        >
                          {isPreviewing ? '⏸ Stop' : '▶ Preview'}
                        </button>
                        {alreadyInFav ? (
                          <span className="creator-added-tag">✓ In Collection</span>
                        ) : (
                          <button
                            type="button"
                            className="echo-btn-primary hov"
                            onClick={() => setSelectedToAdd(song)}
                          >
                            + Select to Add
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Add Selected Song Modal / Sub-bar */}
          {selectedToAdd && (
            <div className="creator-add-dialog">
              <h4>Add "{selectedToAdd.title}" to Shrey's Favorites</h4>
              <div className="creator-add-fields">
                <input
                  type="text"
                  placeholder="Optional: Add your recommendation note or quote (e.g. Peak vocals, best solo...)"
                  value={recommendationNote}
                  onChange={(e) => setRecommendationNote(e.target.value)}
                  className="echo-input hov"
                />
                <div className="creator-dialog-btns">
                  <button
                    type="button"
                    className="echo-btn-secondary hov"
                    onClick={() => setSelectedToAdd(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="echo-btn-primary hov"
                    onClick={() => handleAddSong(selectedToAdd)}
                  >
                    ⭐ Add to Collection
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Favorites Song Grid */}
      <div className="echo-favorites-grid">
        {favorites.map((song, idx) => {
          const isCurrent = currentTrack && (song.src === currentTrack.src || song.id === currentTrack.id)
          const inLib = isInLibrary(song.id)
          const isLoadingThis = loadingTrackId === song.id

          return (
            <div
              key={song.id || idx}
              className={'echo-fav-card hov' + (isCurrent ? ' is-playing' : '') + (song.featured ? ' is-featured' : '')}
              onClick={() => handlePlay(song)}
            >
              <div className="echo-fav-art-wrap">
                <img src={song.cover || '/images/cover-01.svg'} alt={song.title} loading="lazy" />
                <div className="echo-card-play-overlay">
                  <span className="echo-play-icon">
                    {isLoadingThis ? '⏳' : isCurrent && isPlaying ? '❚❚' : '▶'}
                  </span>
                </div>
                {song.featured && <span className="echo-featured-badge">🔥 Featured</span>}
                <span className="echo-fav-rank">#{idx + 1}</span>
              </div>

              <div className="echo-fav-body">
                <div className="echo-fav-main">
                  <h4 title={song.title}>{song.title}</h4>
                  <p title={song.artist}>{song.artist}{song.album ? ` • ${song.album}` : ''}</p>
                  {song.description && (
                    <blockquote className="echo-fav-quote">
                      "{song.description}"
                    </blockquote>
                  )}
                </div>

                <div className="echo-fav-footer">
                  <span className="echo-fav-dur">{song.duration || ''}</span>
                  <div className="echo-fav-action-buttons">
                    <button
                      className={'echo-fav-lib-btn hov' + (inLib ? ' active' : '')}
                      title={inLib ? 'In your library' : 'Save to My Library'}
                      onClick={(e) => handleToggleLibrary(e, song)}
                    >
                      {inLib ? '❤️ Saved' : '🤍 Save'}
                    </button>
                  </div>
                </div>

                {/* Creator Controls (Only visible to authenticated creator) */}
                {isCreator && (
                  <div className="creator-card-toolbar" onClick={(e) => e.stopPropagation()}>
                    <div className="creator-reorder-btns">
                      <button
                        title="Move Up"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, -1)}
                        className="creator-tool-btn hov"
                      >
                        ▲
                      </button>
                      <button
                        title="Move Down"
                        disabled={idx === favorites.length - 1}
                        onClick={() => handleMove(idx, 1)}
                        className="creator-tool-btn hov"
                      >
                        ▼
                      </button>
                    </div>
                    <button
                      onClick={() => handleToggleFeatured(song.id)}
                      className={'creator-tool-btn hov' + (song.featured ? ' active' : '')}
                      title="Toggle Featured"
                    >
                      {song.featured ? '⭐ Featured' : '☆ Mark Featured'}
                    </button>
                    <button
                      onClick={() => handleRemoveFavorite(song.id)}
                      className="creator-tool-btn delete hov"
                      title="Remove from favorites"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Creator Authentication Modal */}
      {showKeyModal && (
        <div className="echo-modal-backdrop" onClick={() => setShowKeyModal(false)}>
          <div className="echo-modal-dialog small" onClick={(e) => e.stopPropagation()}>
            <div className="echo-modal-header">
              <h3>🔒 Creator Authentication</h3>
              <button className="echo-modal-close hov" onClick={() => setShowKeyModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleKeySubmit} className="creator-auth-form">
              <p>Enter your Creator Passkey to manage Shrey's Favorites.</p>
              <input
                type="password"
                placeholder="Enter private passkey"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                autoFocus
                className="echo-input hov"
              />
              {keyError && <p className="echo-form-error">{keyError}</p>}
              <div className="echo-modal-actions">
                <button
                  type="button"
                  className="echo-btn-secondary hov"
                  onClick={() => setShowKeyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="echo-btn-primary hov">
                  Unlock Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
