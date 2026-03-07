import { useState, useCallback } from 'react'

const COPY_TEXT =
  'Read https://audius.co/agents.md and follow the instructions to build with the Audius developer docs.'

export default function CopyBox() {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(COPY_TEXT).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [])

  return (
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderRadius: '8px',
          border: '1px solid var(--vocs-color_border)',
          background: 'var(--vocs-color_background3)',
          overflow: 'hidden',
          boxShadow:
            '0 4px 4px #7F6AD625, 0 -4px 4px #7F6AD625, 4px 0 4px #7F6AD625, -4px 0 4px #7F6AD625',
        }}
      >
        {/* Text */}
        <div
          style={{
            flex: 1,
            padding: '12px 14px',
            fontFamily: "'Menlo', 'Monaco', 'Consolas', monospace",
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--vocs-color_text)',
            textAlign: 'left',
            userSelect: 'all',
            wordBreak: 'break-word',
          }}
        >
          {COPY_TEXT}
        </div>

        {/* Copy button */}
        <button
          type="button"
          onClick={handleCopy}
          style={{
            padding: '0 14px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: copied ? 'var(--vocs-color_tipText, #0F9E48)' : 'var(--vocs-color_text3)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: 500,
            flexShrink: 0,
            transition: 'color 150ms ease',
          }}
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  )
}
