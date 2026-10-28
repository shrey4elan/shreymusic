import { useState, useEffect, useRef } from 'react'
import { getMoments, saveMoment, removeMoment } from './storage'

// Compress and resize image file to lightweight base64 JPEG to preserve localStorage space & load fast
function processImageFile(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file provided'))
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MomentsPage({ onBack, currentTrack, onPlayTrack }) {
  const [moments, setMoments] = useState([])
  const [selected, setSelected] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraErr, setCameraErr] = useState('')

  // Form state
  const [previewImg, setPreviewImg] = useState('')
  const [songTitle, setSongTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [saving, setSaving] = useState(false)

  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const fileInputRef = useRef(null)

  // Load moments from storage
  useEffect(() => {
    setMoments(getMoments())
  }, [])

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const startCamera = async () => {
    setCameraErr('')
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported on this browser.')
      }
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraActive(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch (err) {
      console.warn('Camera error:', err)
      setCameraErr('Could not access front camera. Please use file upload instead.')
      setCameraActive(false)
    }
  }

  const captureCameraFrame = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    // Mirror image for natural selfie feel
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
    setPreviewImg(dataUrl)
    stopCamera()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      stopCamera()
      const compressed = await processImageFile(file)
      setPreviewImg(compressed)
    } catch (err) {
      console.error('File read error:', err)
      alert('Failed to load image. Please try another file.')
    }
  }

  const openNewMomentModal = () => {
    setPreviewImg('')
    setSongTitle(currentTrack ? `${currentTrack.title} • ${currentTrack.artist || ''}` : '')
    setCaption('')
    setCameraErr('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    stopCamera()
    setIsModalOpen(false)
  }

  const handleSaveMoment = (e) => {
    e.preventDefault()
    if (!previewImg) {
      alert('Please take a selfie or upload an image first!')
      return
    }
    setSaving(true)
    const newMoment = saveMoment({
      image: previewImg,
      songTitle: songTitle || (currentTrack ? currentTrack.title : 'Soundtrack'),
      caption: caption,
    })
    if (newMoment) {
      setMoments(getMoments())
      closeModal()
    } else {
      alert('Storage quota reached. Try removing an older moment.')
    }
    setSaving(false)
  }

  const handleDeleteMoment = (e, id) => {
    e.stopPropagation()
    if (confirm('Delete this moment from your archive?')) {
      removeMoment(id)
      setMoments(getMoments())
      if (selected !== null && moments[selected]?.id === id) {
        setSelected(null)
      }
    }
  }

  return (
    <div className="echo-moments-page">
      <header className="moments-header">
        <button className="echo-back-btn hov" onClick={onBack}>
          ← Back to Music Hub
        </button>
        <div className="moments-title-block">
          <span className="moments-kicker">Visual Soundtrack Archive</span>
          <h1 className="moments-title">Moments & Selfies</h1>
          <p className="moments-sub">
            Capture your vibe. Pair a selfie or memory with your favorite song and caption.
          </p>
        </div>
        <button className="echo-add-moment-btn hov" onClick={openNewMomentModal}>
          📸 Capture New Moment
        </button>
      </header>

      {/* Main Content: Blank State or Grid of Moments */}
      {moments.length === 0 ? (
        <div className="moments-empty-state">
          <div className="moments-empty-card">
            <div className="moments-empty-icon">📷</div>
            <h2>Archive is Blank</h2>
            <p>
              You haven't captured any visual memories yet. Take a selfie or upload a photo with your
              current soundtrack to bring your personal moments to life!
            </p>
            <button className="echo-btn-primary hov" onClick={openNewMomentModal}>
              📸 Snap or Upload Your First Moment
            </button>
          </div>
        </div>
      ) : (
        <div className="moments-grid">
          {moments.map((item, idx) => (
            <div
              key={item.id || idx}
              className="moment-card hov"
              onClick={() => setSelected(idx)}
              style={{ '--ratio': item.ratio || '4/3' }}
            >
              <div className="moment-img-wrap">
                <img src={item.image} alt={item.caption || item.songTitle} loading="lazy" />
                <button
                  className="moment-delete-btn hov"
                  title="Delete moment"
                  onClick={(e) => handleDeleteMoment(e, item.id)}
                >
                  ✕
                </button>
                <div className="moment-overlay">
                  {item.songTitle && (
                    <div
                      className="moment-song-pill"
                      title={item.songTitle}
                      onClick={(e) => {
                        if (onPlayTrack) {
                          e.stopPropagation()
                          onPlayTrack(item.songTitle)
                        }
                      }}
                    >
                      🎵 {item.songTitle}
                    </div>
                  )}
                  {item.caption && <span className="moment-cap">{item.caption}</span>}
                  <span className="moment-date">
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Capture / Upload Selfie + Song Title + Caption */}
      {isModalOpen && (
        <div className="echo-modal-backdrop" onClick={closeModal}>
          <div className="echo-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="echo-modal-header">
              <h3>📸 Capture Your Moment</h3>
              <button className="echo-modal-close hov" onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMoment} className="moment-form">
              {/* Image Input Area */}
              <div className="moment-capture-box">
                {cameraActive ? (
                  <div className="moment-live-camera">
                    <video ref={videoRef} playsInline autoPlay muted className="moment-video-feed" />
                    <div className="moment-camera-controls">
                      <button
                        type="button"
                        className="moment-snap-btn hov"
                        onClick={captureCameraFrame}
                      >
                        🔘 Snap Selfie
                      </button>
                      <button
                        type="button"
                        className="echo-btn-secondary hov"
                        onClick={stopCamera}
                      >
                        Cancel Camera
                      </button>
                    </div>
                  </div>
                ) : previewImg ? (
                  <div className="moment-preview-wrap">
                    <img src={previewImg} alt="Preview" className="moment-preview-img" />
                    <button
                      type="button"
                      className="moment-retake-btn hov"
                      onClick={() => setPreviewImg('')}
                    >
                      🔄 Retake / Choose Different Photo
                    </button>
                  </div>
                ) : (
                  <div className="moment-prompt-box">
                    <div className="moment-prompt-icon">🤳</div>
                    <p>Take a selfie with your camera or select a photo from your gallery</p>
                    {cameraErr && <p className="moment-camera-err">{cameraErr}</p>}
                    <div className="moment-btn-row">
                      <button
                        type="button"
                        className="echo-btn-primary hov"
                        onClick={startCamera}
                      >
                        📷 Open Front Camera / Selfie
                      </button>
                      <button
                        type="button"
                        className="echo-btn-secondary hov"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        📁 Choose File / Photo
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="moment-fields">
                <label className="moment-label">
                  <span>🎵 Song Title</span>
                  {currentTrack && (
                    <button
                      type="button"
                      className="moment-fill-track-btn hov"
                      onClick={() =>
                        setSongTitle(`${currentTrack.title} • ${currentTrack.artist || ''}`)
                      }
                    >
                      Use Playing: {currentTrack.title}
                    </button>
                  )}
                  <input
                    type="text"
                    className="echo-input hov"
                    placeholder="e.g. Kesariya • Arijit Singh"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                  />
                </label>

                <label className="moment-label">
                  <span>💬 Caption / Memory</span>
                  <textarea
                    rows="3"
                    className="echo-input hov moment-textarea"
                    placeholder="Write a memory, thought, or aesthetic caption..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </label>
              </div>

              <div className="moment-form-actions">
                <button
                  type="button"
                  className="echo-btn-secondary hov"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!previewImg || saving}
                  className="echo-btn-primary hov"
                >
                  {saving ? 'Saving...' : '💾 Save to Visual Archive'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox for Moments */}
      {selected !== null && moments[selected] && (
        <div className="echo-lightbox" onClick={() => setSelected(null)}>
          <button className="echo-lb-close" onClick={() => setSelected(null)}>
            ✕
          </button>
          <button
            className="echo-lb-nav echo-lb-prev"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((selected - 1 + moments.length) % moments.length)
            }}
          >
            ‹
          </button>
          <figure onClick={(e) => e.stopPropagation()} className="echo-lb-figure">
            <img src={moments[selected].image} alt={moments[selected].caption} />
            <figcaption>
              {moments[selected].songTitle && <b>🎵 {moments[selected].songTitle}</b>}
              {moments[selected].caption && <p>{moments[selected].caption}</p>}
              <span>
                {selected + 1} / {moments.length}
              </span>
            </figcaption>
          </figure>
          <button
            className="echo-lb-nav echo-lb-next"
            onClick={(e) => {
              e.stopPropagation()
              setSelected((selected + 1) % moments.length)
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
