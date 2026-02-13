import React, { useState, useCallback } from 'react'

const COPY_TEXT =
  'Read https://audius.co/agents.md and follow the instructions to build with the Audius developer docs.'

export default function CopyBox() {
  const [showToast, setShowToast] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(COPY_TEXT).then(() => {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2000)
    })
  }, [])

  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '560px' }}>
      <div
        style={{
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          padding: '10px 44px 10px 12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          position: 'relative',
          textAlign: 'left',
          display: 'inline-flex',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <span>{COPY_TEXT}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            position: 'absolute',
            top: '50%',
            right: '12px',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--ifm-font-color-base)',
            opacity: 0.7,
          }}
          aria-label="Copy to clipboard"
          title="Copy to clipboard"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      </div>
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--ifm-color-emphasis-800)',
            color: 'var(--ifm-color-gray-0)',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 9999,
            animation: 'copyToastFadeIn 0.2s ease-out',
          }}
        >
          Copied!
        </div>
      )}
      <style>{`
        @keyframes copyToastFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
