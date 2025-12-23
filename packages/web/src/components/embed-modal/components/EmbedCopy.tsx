import { useCallback } from 'react'

import Toast from 'components/toast/Toast'
import { copyToClipboard } from 'utils/clipboardUtil'

import styles from './EmbedCopy.module.css'

const messages = {
  copy: 'Click To Copy',
  copied: 'Copied To Clipboard!'
}

type EmbedCopyProps = {
  frameString: string
  onCopy: () => void
}

const EmbedCopy = ({ frameString, onCopy }: EmbedCopyProps) => {
  const copy = useCallback(() => {
    copyToClipboard(frameString)
    onCopy()
  }, [frameString, onCopy])

  return (
    <Toast
      text={messages.copied}
      requireAccount={false}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      transformOrigin={{ horizontal: 'center', vertical: 'top' }}
      portalLocation={
        typeof document !== 'undefined'
          ? document.getElementById('page') || document.body
          : undefined
      }
    >
      <div className={styles.copy} onClick={copy}>
        <div className={styles.box}>{frameString}</div>
        <div className={styles.click}>{messages.copy}</div>
      </div>
    </Toast>
  )
}

export default EmbedCopy
