import { MouseEventHandler, useCallback } from 'react'

import { useUserByHandle } from '@audius/common/api'
import { Nullable, getXShareHandle } from '@audius/common/utils'
import { Button, ButtonProps, IconX } from '@audius/harmony'

import { useRecord, TrackEvent } from 'common/store/analytics/actions'
import { openXLink } from 'utils/xShare'

const messages = {
  share: 'Share'
}

type StaticXProps = {
  type: 'static'
  shareText: string
  analytics?: TrackEvent
}

type DynamicXProps = {
  type: 'dynamic'
  handle: string
  name?: string
  additionalHandle?: string
  shareData: (
    xHandle: string,
    otherXHandle?: Nullable<string>
  ) => Nullable<{ shareText: string; analytics: TrackEvent }>
}

type XShareButtonProps = {
  url?: string
  hideText?: boolean
  fullWidth?: ButtonProps['fullWidth']
  size?: ButtonProps['size']
  onAfterShare?: () => void
} & (StaticXProps | DynamicXProps)

export const XShareButton = (props: XShareButtonProps) => {
  const {
    url = null,
    fullWidth,
    size = 'small',
    hideText,
    onAfterShare,
    ...other
  } = props
  const record = useRecord()

  const { data: user } = useUserByHandle(
    'handle' in other ? other.handle : undefined
  )

  const { data: additionalUser } = useUserByHandle(
    'additionalHandle' in other ? other.additionalHandle : undefined
  )

  const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
    (e) => {
      e.stopPropagation()
      if (other.type === 'static') {
        openXLink(url, other.shareText)
        if (other.analytics) {
          record(other.analytics)
        }
        onAfterShare?.()
      } else if (
        other.type === 'dynamic' &&
        user?.handle &&
        (other.additionalHandle ? additionalUser?.handle : true)
      ) {
        const handle = user ? getXShareHandle(user) : ''

        const otherHandle =
          other.additionalHandle && additionalUser
            ? getXShareHandle(additionalUser)
            : null

        const xData = other.shareData(handle, otherHandle)
        if (xData) {
          const { shareText, analytics } = xData
          openXLink(url, shareText)
          if (analytics) {
            record(analytics)
          }
          onAfterShare?.()
        }
      }
    },
    [other, user, additionalUser, url, onAfterShare, record]
  )

  return (
    <Button
      variant='secondary'
      fullWidth={fullWidth}
      size={size}
      onClick={handleClick}
      iconLeft={IconX}
    >
      {hideText ? undefined : messages.share}
    </Button>
  )
}
