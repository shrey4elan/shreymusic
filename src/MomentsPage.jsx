import {useState} from 'react'
import cfg from './config'

export default function MomentsPage({onBack}){
  const [selected, setSelected] = useState(null)
  const photos = cfg.photos || []

  return (
    <div className="echo-moments-page">
      <header className="moments-header">
        <button className="echo-back-btn hov" onClick={onBack}>
          ← Back to Music
        </button>
        <div className="moments-title-block">
          <span className="moments-kicker">Visual Archive</span>
          <h1 className="moments-title">Moments & Highlights</h1>
          <p className="moments-sub">Captured snapshots, album artwork, and cinematic imagery.</p>
        </div>
      </header>

      <div className="moments-grid">
        {photos.map((item, idx) => (
          <div
            key={idx}
            className="moment-card hov"
            onClick={() => setSelected(idx)}
            style={{'--ratio': item.ratio || '4/3'}}
          >
            <div className="moment-img-wrap">
              <img src={item.src} alt={item.caption} loading="lazy" />
              <div className="moment-overlay">
                <span className="moment-num">0{idx + 1}</span>
                <span className="moment-cap">{item.caption}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selected !== null && (
        <div className="echo-lightbox" onClick={() => setSelected(null)}>
          <button className="echo-lb-close" onClick={() => setSelected(null)}>✕</button>
          <button
            className="echo-lb-nav echo-lb-prev"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((selected - 1 + photos.length) % photos.length)
            }}
          >
            ‹
          </button>
          <figure onClick={(e) => e.stopPropagation()} className="echo-lb-figure">
            <img src={photos[selected].src} alt={photos[selected].caption} />
            <figcaption>
              <b>{photos[selected].caption}</b>
              <span>{selected + 1} / {photos.length}</span>
            </figcaption>
          </figure>
          <button
            className="echo-lb-nav echo-lb-next"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((selected + 1) % photos.length)
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}

