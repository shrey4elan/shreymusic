import { useState } from 'react'
import { dismissUpdate } from './updater'

export default function UpdateModal({ updateInfo, onClose }) {
  const [downloading, setDownloading] = useState(false)

  if (!updateInfo || !updateInfo.hasUpdate) return null

  const handleDownload = () => {
    setDownloading(true)
    if (updateInfo.apkUrl) {
      // Open in Android system browser/download manager
      window.open(updateInfo.apkUrl, '_system')
    }
  }

  const handleDismiss = () => {
    dismissUpdate(updateInfo.latestVersionCode)
    onClose()
  }

  return (
    <div className="echo-modal-backdrop" onClick={updateInfo.forceUpdate ? undefined : handleDismiss}>
      <div className="echo-modal-dialog small echo-update-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="echo-modal-header">
          <div className="echo-update-badge">🚀 NEW UPDATE AVAILABLE</div>
          {!updateInfo.forceUpdate && (
            <button className="echo-modal-close hov" onClick={handleDismiss}>
              ✕
            </button>
          )}
        </div>

        <div className="echo-update-body">
          <h3 className="echo-update-title">Shrey Music v{updateInfo.latestVersion}</h3>
          <p className="echo-update-version-tag">
            Current: <b>v{updateInfo.currentVersion}</b> → New: <b>v{updateInfo.latestVersion}</b>
          </p>

          <div className="echo-update-notes-box">
            <h4>What's New in This Version:</h4>
            <p>{updateInfo.releaseNotes}</p>
          </div>

          <div className="echo-update-info-note">
            💡 Tapping Update will download the new APK. Open the downloaded file to update instantly without losing your library or moments!
          </div>

          <div className="echo-update-actions">
            {!updateInfo.forceUpdate && (
              <button type="button" className="echo-btn-secondary hov" onClick={handleDismiss}>
                Later
              </button>
            )}
            <button
              type="button"
              className="echo-btn-primary echo-update-btn hov"
              onClick={handleDownload}
            >
              {downloading ? '⏳ Downloading...' : '🚀 Download & Install Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
