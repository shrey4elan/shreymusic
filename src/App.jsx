import { useEffect, useRef, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import cfg from './config'
import Scene, { state, Boundary } from './Scene'
import Desert from './Desert'
import MomentsPage from './MomentsPage'
import MyLibrary from './MyLibrary'
import ShreysFavorites from './ShreysFavorites'
import { useAudio, Controls, Visualizer } from './Audio'
import { searchSongs, resolveSongUrl } from './saavn'
import { isInLibrary, saveToLibrary, removeFromLibrary } from './storage'

gsap.registerPlugin(ScrollTrigger)

const hasGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
const low = matchMedia('(pointer:coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4

// Quick preset chips for instant browsing
const GENRE_CHIPS = ['Trending', 'Bollywood', 'Lo-Fi Chill', 'Punjabi Hits', 'Arijit Singh', 'Global Top', 'Sad Songs']

export default function App() {
  const [activeTab, setActiveTab] = useState('home') // 'home' | 'library' | 'favorites' | 'moments'
  const [ready, setReady] = useState(false)
  const [rm, setRm] = useState(matchMedia('(prefers-reduced-motion:reduce)').matches)
  const [fs, setFs] = useState(false)
  const [tracks, setTracks] = useState(cfg.tracks)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeChip, setActiveChip] = useState('Trending')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchErr, setSearchErr] = useState('')
  const [, setLibTick] = useState(0) // Forces re-render of heart states when library changes

  const searchTimeout = useRef(null)
  const abortCtrl = useRef(null)

  const root = useRef()
  const cur = useRef()
  const a = useAudio(tracks)
  const ok = useRef(hasGL()).current
  const tr = a.track || tracks[a.i] || tracks[0]

  const done = () => setTimeout(() => setReady(true), 900)

  // Trigger search with query, request cancellation & caching
  const executeSearch = useCallback((query) => {
    if (!query || !query.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }

    // Abort previous in-flight request if user kept typing or clicked another chip
    if (abortCtrl.current) {
      abortCtrl.current.abort()
    }
    const ctrl = new AbortController()
    abortCtrl.current = ctrl

    setSearching(true)
    setSearchErr('')

    searchSongs(query, { signal: ctrl.signal, cache: true })
      .then((results) => {
        setSearchResults(results)
        if (results.length === 0) {
          setSearchErr('No songs found. Try another search.')
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setSearchErr('Could not retrieve tracks. Please check connection.')
      })
      .finally(() => {
        setSearching(false)
      })
  }, [])

  // Initial trending load on mount
  useEffect(() => {
    let mounted = true
    searchSongs('Top Hindi Hits', { cache: true })
      .then((res) => {
        if (mounted && res.length > 0) {
          setSearchResults(res)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Debounced input search
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    setActiveChip('')
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      executeSearch(val)
    }, 380)
  }

  // Click on genre pill
  const handleChipClick = (chip) => {
    setActiveChip(chip)
    setSearchQuery(chip)
    executeSearch(chip)
  }

  // Play a track from results, resolving dynamic URL if needed
  const playSaavnSong = async (song) => {
    let playable = song
    if (!song.src) {
      const resolved = await resolveSongUrl(song)
      if (resolved) {
        playable = { ...song, src: resolved }
      }
    }
    const existingIndex = tracks.findIndex(
      (t) => (playable.id && t.id === playable.id) || t.src === playable.src
    )
    if (existingIndex !== -1) {
      a.select(existingIndex)
    } else {
      const newTracks = [playable, ...tracks]
      setTracks(newTracks)
      a.playTrack(playable)
    }
  }

  // Toggle song in My Library
  const handleToggleLib = (e, song) => {
    e.stopPropagation()
    if (isInLibrary(song.id)) {
      removeFromLibrary(song.id)
    } else {
      saveToLibrary(song)
    }
    setLibTick((t) => t + 1)
  }

  useEffect(() => {
    if (!ok) setReady(true)
    const t = setTimeout(() => setReady(true), 6000)
    return () => clearTimeout(t)
  }, [ok])

  useEffect(() => {
    state.reduced = rm
    document.documentElement.classList.toggle('rm', rm)
  }, [rm])

  useEffect(() => {
    const mv = (e) => {
      state.mx = (e.clientX / innerWidth) * 2 - 1
      state.my = (e.clientY / innerHeight) * 2 - 1
      if (cur.current) {
        cur.current.style.transform = `translate(${e.clientX}px,${e.clientY}px)`
        cur.current.classList.toggle('on', !!e.target.closest?.('a,button,input,.hov'))
      }
    }
    const f = () => setFs(!!document.fullscreenElement)
    addEventListener('mousemove', mv)
    document.addEventListener('fullscreenchange', f)
    return () => {
      removeEventListener('mousemove', mv)
      document.removeEventListener('fullscreenchange', f)
    }
  }, [])

  const toggleFs = () =>
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()

  return (
    <>
      <div className="cur" ref={cur} aria-hidden="true" />
      <div className={'ld' + (ready ? ' hide' : '')} role="status" aria-live="polite">
        <div>
          <b>SHREY MUSIC</b>
          <div className="bar">
            <span />
          </div>
        </div>
      </div>

      {/* Background visuals (Desert & 3D Ambient Scene) */}
      <Desert />
      <div className="veil" />
      {ok ? (
        <Boundary fallback={<div className="fb" />}>
          <Scene low={low} onReady={done} />
        </Boundary>
      ) : (
        <div className="fb" />
      )}

      {/* Shrey Music Top Navigation Bar */}
      <header className="echo-navbar">
        <div className="echo-nav-brand hov" onClick={() => setActiveTab('home')}>
          <div className="echo-logo-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span className="echo-logo-text">SHREY</span>
          <span className="echo-logo-tag">MUSIC</span>
        </div>

        <nav className="echo-nav-tabs">
          <button
            className={'echo-tab-btn hov' + (activeTab === 'home' ? ' active' : '')}
            onClick={() => setActiveTab('home')}
          >
            🎵 Music Hub
          </button>
          <button
            className={'echo-tab-btn hov' + (activeTab === 'library' ? ' active' : '')}
            onClick={() => setActiveTab('library')}
          >
            ❤️ My Library
          </button>
          <button
            className={'echo-tab-btn hov' + (activeTab === 'favorites' ? ' active' : '')}
            onClick={() => setActiveTab('favorites')}
          >
            ⭐ Shrey's Favorites
          </button>
          <button
            className={'echo-tab-btn hov' + (activeTab === 'moments' ? ' active' : '')}
            onClick={() => setActiveTab('moments')}
          >
            📸 Moments & Selfies
          </button>
        </nav>

        <div className="echo-nav-actions">
          <button className="echo-action-pill hov" aria-pressed={a.muted} onClick={a.toggleMute}>
            {a.muted ? '🔇 Muted' : '🔊 Sound'}
          </button>
          <button className="echo-action-pill hov" onClick={toggleFs}>
            {fs ? 'Exit ⛶' : '⛶ Fullscreen'}
          </button>
        </div>
      </header>

      {/* Dedicated Views */}
      {activeTab === 'moments' && (
        <MomentsPage
          onBack={() => setActiveTab('home')}
          currentTrack={tr}
          onPlayTrack={(title) => {
            setActiveTab('home')
            setSearchQuery(title)
            executeSearch(title)
          }}
        />
      )}

      {activeTab === 'library' && (
        <MyLibrary
          currentTrack={tr}
          isPlaying={a.playing}
          onPlaySong={playSaavnSong}
          onBrowseTrending={() => {
            setActiveTab('home')
            setActiveChip('Trending')
            executeSearch('Top Hindi Hits')
          }}
        />
      )}

      {activeTab === 'favorites' && (
        <ShreysFavorites
          currentTrack={tr}
          isPlaying={a.playing}
          onPlaySong={playSaavnSong}
        />
      )}

      {activeTab === 'home' && (
        <main className="echo-music-hub" ref={root}>
          {/* Hero Music Header */}
          <section className="echo-hero-section">
            <div className="echo-hero-content">
              <span className="echo-badge">UNLIMITED HI-RES STREAMING</span>
              <h1 className="echo-headline">SHREY MUSIC</h1>
              <p className="echo-subtitle">
                Search, discover, and stream millions of tracks with ambient 3D visuals.
              </p>

              {/* Quick Filter Chips */}
              <div className="echo-chips-row">
                {GENRE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className={'echo-chip hov' + (activeChip === chip ? ' active' : '')}
                    onClick={() => handleChipClick(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Large Futuristic Search Bar */}
              <div className="echo-search-wrapper">
                <span className="echo-search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search songs, artists, albums, or soundtracks..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="echo-search-input hov"
                />
                {searching && <span className="echo-search-spinner">Searching...</span>}
              </div>
              {searchErr && <p className="echo-search-err">{searchErr}</p>}
            </div>
          </section>

          {/* Music Dashboard Layout: Left Player / Right Streams */}
          <section className="echo-dashboard-section">
            {/* Now Playing Featured Glass Deck */}
            <div className="echo-deck-card">
              <div className="echo-deck-left">
                <div className="vw">
                  <div className={'vinyl' + (a.playing ? ' on' : '')}>
                    <i style={{ backgroundImage: `url(${tr.cover})` }} />
                  </div>
                </div>
              </div>

              <div className="echo-deck-right">
                <span className="echo-now-tag">NOW PLAYING</span>
                <h2 className="echo-track-title">{tr.title}</h2>
                <p className="echo-track-artist">
                  {tr.artist}
                  {tr.album ? ` • ${tr.album}` : ''}
                </p>

                {/* Visualizer & Audio Controls */}
                <Visualizer a={a} />
                <Controls a={a} />

                {a.err && <p className="echo-track-err">Stream unavailable. Please select another song.</p>}

                {/* Quick Queue / Active Playlist */}
                <div className="echo-queue-block">
                  <div className="echo-section-heading">CURRENT QUEUE ({tracks.length})</div>
                  <div className="echo-queue-list">
                    {tracks.map((t, idx) => (
                      <button
                        key={t.src || t.id || idx}
                        className={'echo-queue-item hov' + (idx === a.i ? ' active' : '')}
                        onClick={() => a.select(idx)}
                      >
                        <img src={t.cover} alt="" width="36" height="36" loading="lazy" />
                        <div className="echo-queue-meta">
                          <b>{t.title}</b>
                          <span>{t.artist}</span>
                        </div>
                        <em>{t.duration}</em>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Trending Catalog Grid */}
            <div className="echo-catalog-section">
              <div className="echo-catalog-header">
                <h3>{searchQuery ? `Search Results for "${searchQuery}"` : '🔥 Popular & Trending Now'}</h3>
                <span className="echo-results-count">{searchResults.length} tracks</span>
              </div>

              <div className="echo-cards-grid">
                {searchResults.map((song) => {
                  const isCurrent = tr && (song.src === tr.src || (song.id && song.id === tr.id))
                  const inLib = isInLibrary(song.id)

                  return (
                    <div
                      key={song.id}
                      className={'echo-song-card hov' + (isCurrent ? ' is-playing' : '')}
                      onClick={() => playSaavnSong(song)}
                    >
                      <div className="echo-card-art">
                        <img src={song.cover} alt={song.title} loading="lazy" />
                        <div className="echo-card-play-overlay">
                          <span className="echo-play-icon">{isCurrent && a.playing ? '❚❚' : '▶'}</span>
                        </div>
                        <button
                          className={'echo-card-heart-btn hov' + (inLib ? ' active' : '')}
                          title={inLib ? 'Remove from My Library' : 'Save to My Library'}
                          onClick={(e) => handleToggleLib(e, song)}
                        >
                          {inLib ? '❤️' : '🤍'}
                        </button>
                      </div>
                      <div className="echo-card-info">
                        <h4 title={song.title}>{song.title}</h4>
                        <p title={song.artist}>{song.artist}</p>
                        <span className="echo-card-dur">{song.duration}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Sticky Bottom Mini Player (Always accessible) */}
      <aside className="echo-bottom-bar" aria-label="Shrey Music Player">
        <div className="echo-bar-track">
          <img src={tr.cover} alt="" className="echo-bar-art" loading="lazy" />
          <div className="echo-bar-info">
            <b>{tr.title}</b>
            <span>{tr.artist}</span>
          </div>
        </div>
        <Controls a={a} compact />
      </aside>
    </>
  )
}
