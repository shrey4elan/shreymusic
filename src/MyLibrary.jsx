import { useState, useEffect } from 'react'
import { getLibrary, removeFromLibrary } from './storage'
import { resolveSongUrl } from './saavn'

export default function MyLibrary({ currentTrack, isPlaying, onPlaySong, onBrowseTrending }) {
  const [library, setLibrary] = useState([])
  const [loadingTrackId, setLoadingTrackId] = useState(null)

  const reload = () => {
    setLibrary(getLibrary())
  }

  useEffect(() => {
    reload()
    // Listen for storage events across tabs or local updates
    window.addEventListener('storage', reload)
    return () => window.removeEventListener('storage', reload)
  }, [])

  const handleRemove = (e, songId) => {
    e.stopPropagation()
    removeFromLibrary(songId)
    reload()
  }

  const handlePlay = async (song) => {
    if (loadingTrackId) return
    setLoadingTrackId(song.id)
    try {
      // Dynamically verify/resolve stream URL if expired or missing
      const streamUrl = await resolveSongUrl(song)
      if (streamUrl) {
        onPlaySong({ ...song, src: streamUrl })
      } else {
        alert('Could not retrieve playback stream for this song. Please try another track.')
      }
    } catch (err) {
      console.warn('Playback resolution error:', err)
      onPlaySong(song)
    } finally {
      setLoadingTrackId(null)
    }
  }

  return (
    <section className="echo-library-view">
      <div className="echo-view-header">
        <div className="echo-view-title-wrap">
          <span className="echo-view-kicker">PERSONAL COLLECTION</span>
          <h2 className="echo-view-title">My Library</h2>
          <p className="echo-view-sub">
            Your saved favorites and tracks, stored locally on your device for instant playback.
          </p>
        </div>
        <div className="echo-view-stats">
          <span className="echo-count-badge">❤️ {library.length} {library.length === 1 ? 'Track' : 'Tracks'}</span>
        </div>
      </div>

      {library.length === 0 ? (
        <div className="echo-empty-state">
          <div className="echo-empty-icon">🎧</div>
          <h3>Your Library is Empty</h3>
          <p>
            You haven't saved any tracks yet. Click the heart icon (❤️) on any song card in the Music Hub or Shrey's Favorites to build your personal library!
          </p>
          {onBrowseTrending && (
            <button className="echo-btn-primary hov" onClick={onBrowseTrending}>
              🔥 Explore Trending Songs
            </button>
          )}
        </div>
      ) : (
        <div className="echo-cards-grid">
          {library.map((song) => {
            const isCurrent = currentTrack && (song.src === currentTrack.src || song.id === currentTrack.id)
            const isLoadingThis = loadingTrackId === song.id

            return (
              <div
                key={song.id}
                className={'echo-song-card hov' + (isCurrent ? ' is-playing' : '')}
                onClick={() => handlePlay(song)}
              >
                <div className="echo-card-art">
                  <img src={song.cover || '/images/cover-01.svg'} alt={song.title} loading="lazy" />
                  <div className="echo-card-play-overlay">
                    <span className="echo-play-icon">
                      {isLoadingThis ? '⏳' : isCurrent && isPlaying ? '❚❚' : '▶'}
                    </span>
                  </div>
                  <button
                    className="echo-card-action-btn hov echo-card-heart active"
                    title="Remove from My Library"
                    onClick={(e) => handleRemove(e, song.id)}
                  >
                    ❤️
                  </button>
                </div>
                <div className="echo-card-info">
                  <h4 title={song.title}>{song.title}</h4>
                  <p title={song.artist}>{song.artist}</p>
                  <div className="echo-card-footer">
                    <span className="echo-card-dur">{song.duration || ''}</span>
                    <button
                      className="echo-card-remove-text hov"
                      onClick={(e) => handleRemove(e, song.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
