import { MutableRefObject, useCallback, useMemo } from 'react'

import {
  playbackActions,
  playbackSelectors,
  PlaybackRate
} from '@audius/common/store'
import {
  PopupMenu,
  PopupMenuItem,
  IconPlaybackRate0_5x,
  IconPlaybackRate0_8x,
  IconPlaybackRate1x,
  IconPlaybackRate1_1x,
  IconPlaybackRate1_2x,
  IconPlaybackRate1_5x,
  IconPlaybackRate2x,
  IconPlaybackRate2_5x,
  IconPlaybackRate3x
} from '@audius/harmony'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import zIndex from 'utils/zIndex'

import styles from '../PlayBarButton.module.css'

const { setPlaybackRate } = playbackActions
const { getPlaybackRate } = playbackSelectors

type PlaybackRateButtonProps = {
  isMobile: boolean
}

const messages = {
  title: 'Playback'
}

const rates: PlaybackRate[] = [
  '0.5x',
  '0.8x',
  '1x',
  '1.1x',
  '1.2x',
  '1.5x',
  '2x',
  '2.5x',
  '3x'
]

const playbackRateIconMap: Record<PlaybackRate, typeof IconPlaybackRate1x> = {
  '0.5x': IconPlaybackRate0_5x,
  '0.8x': IconPlaybackRate0_8x,
  '1x': IconPlaybackRate1x,
  '1.1x': IconPlaybackRate1_1x,
  '1.2x': IconPlaybackRate1_2x,
  '1.5x': IconPlaybackRate1_5x,
  '2x': IconPlaybackRate2x,
  '2.5x': IconPlaybackRate2_5x,
  '3x': IconPlaybackRate3x
}

export const PlaybackRateButton = ({ isMobile }: PlaybackRateButtonProps) => {
  const dispatch = useDispatch()
  const setRate = useCallback(
    (rate: PlaybackRate) => dispatch(setPlaybackRate({ rate })),
    [dispatch]
  )
  const playbackRate = useSelector(getPlaybackRate)
  const Icon = playbackRateIconMap[playbackRate]

  const items: PopupMenuItem[] = useMemo(
    () =>
      rates.map((rate) => ({
        text: rate,
        onClick: () => setRate(rate),
        className: styles.centeredItem
      })),
    [setRate]
  )

  const renderButton = useCallback(
    (ref: MutableRefObject<any>, triggerPopup: () => void) => (
      <button
        aria-label='Playback speed'
        className={cn(styles.button, styles.playbackRateButton, {
          [styles.buttonFixedSize]: isMobile
        })}
        onClick={triggerPopup}
      >
        <Icon color='default' ref={ref} />
      </button>
    ),
    [Icon, isMobile]
  )

  return (
    <PopupMenu
      title={messages.title}
      items={items}
      hideCloseButton
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      zIndex={zIndex.PLAY_BAR_POPUP_MENU}
      renderTrigger={renderButton}
    />
  )
}
