import { useCallback, useEffect, useState } from 'react'

import { StringKeys } from '@audius/common/services'
import { IconClose, IconError } from '@audius/harmony'
import cn from 'classnames'

import { useRemoteVar } from 'hooks/useRemoteConfig'

import styles from './Notice.module.css'

const messages = {
  dismiss: 'Dismiss notice'
}

const Notice = ({ shouldPadTop }: { shouldPadTop: boolean }) => {
  const [isVisible, setIsVisible] = useState(false)
  const hide = useCallback(() => setIsVisible(false), [setIsVisible])

  const noticeText = useRemoteVar(StringKeys.APP_WIDE_NOTICE_TEXT)

  useEffect(() => {
    if (noticeText) {
      setIsVisible(true)
    }
  }, [noticeText])

  return (
    <div
      className={cn(styles.notice, {
        [styles.show]: isVisible,
        [styles.shouldPadTop]: shouldPadTop
      })}
    >
      <div
        className={cn(styles.content, {
          [styles.contentShow]: isVisible
        })}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            width: '100%'
          }}
        >
          <IconError color='white' size='m' aria-hidden />
          <span style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            {noticeText}
          </span>
          <IconClose
            color='white'
            size='m'
            onClick={hide}
            aria-label={messages.dismiss}
          />
        </div>
      </div>
    </div>
  )
}

export default Notice
