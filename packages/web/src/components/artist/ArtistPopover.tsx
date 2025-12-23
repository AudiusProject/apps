import { ReactNode, useRef, useCallback, MutableRefObject } from 'react'

import { useCurrentUserId, useUserByHandle } from '@audius/common/api'
import { Popup, type PopupProps, type Origin } from '@audius/harmony'
import { useHoverDelay } from '@audius/harmony/src/hooks/useHoverDelay'
import { CSSObject } from '@emotion/react'

import { ArtistCard } from './ArtistCard'

type ArtistPopoverProps = {
  handle: string | undefined
  children: ReactNode
  onNavigateAway?: () => void
  mouseEnterDelay?: number
  anchorOrigin?: Origin
  transformOrigin?: Origin
  css?: CSSObject
} & Omit<
  PopupProps,
  | 'anchorRef'
  | 'isVisible'
  | 'onClose'
  | 'children'
  | 'hideCloseButton'
  | 'zIndex'
  | 'dismissOnMouseLeave'
  | 'shadow'
>

const DEFAULT_ANCHOR_ORIGIN: Origin = {
  horizontal: 'right',
  vertical: 'center'
}

const DEFAULT_TRANSFORM_ORIGIN: Origin = {
  horizontal: 'left',
  vertical: 'center'
}

export const ArtistPopover = ({
  handle,
  children,
  onNavigateAway,
  mouseEnterDelay = 0.5,
  anchorOrigin = DEFAULT_ANCHOR_ORIGIN,
  transformOrigin = DEFAULT_TRANSFORM_ORIGIN,
  css,
  ...popupProps
}: ArtistPopoverProps) => {
  const anchorRef = useRef<HTMLSpanElement | null>(
    null
  ) as MutableRefObject<HTMLElement | null>

  const { isVisible, handleMouseEnter, handleMouseLeave, clearTimer } =
    useHoverDelay(mouseEnterDelay, 'hover')

  const { data: creator } = useUserByHandle(handle)
  const { data: userId } = useCurrentUserId()

  const handleClose = useCallback(() => {
    clearTimer()
    onNavigateAway?.()
  }, [clearTimer, onNavigateAway])

  const content =
    creator && userId !== creator.user_id ? (
      <ArtistCard artist={creator} onNavigateAway={handleClose} />
    ) : null

  return (
    <span
      ref={anchorRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...(css && { css })}
    >
      {children}
      {content && (
        <Popup
          {...popupProps}
          anchorRef={anchorRef}
          isVisible={isVisible}
          onClose={handleClose}
          hideCloseButton
          zIndex={20000}
          anchorOrigin={anchorOrigin}
          transformOrigin={transformOrigin}
          dismissOnMouseLeave
          shadow='far'
        >
          {content}
        </Popup>
      )}
    </span>
  )
}
