import { MouseEvent, useCallback, useRef, useState } from 'react'

import { useTrack } from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import {
  Flex,
  IconButton,
  IconClose,
  IconDrag,
  IconKebabHorizontal,
  IconPause,
  IconPlay,
  Image,
  Text,
  useTheme
} from '@audius/harmony'

import { UserLink } from 'components/link/UserLink'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

type MiniTrackTileProps = {
  trackId: ID
  isPlaying?: boolean
  isActive?: boolean
  onPlay?: () => void
  onRemove?: () => void
  onMore?: (anchorEl: HTMLElement) => void
  onTitleClick?: () => void
  showHoverActions?: boolean
  /**
   * Renders a decorative grip icon on the left of the row to indicate the
   * row is draggable. The actual drag handler is bound by the parent on the
   * outer wrapper, not the grip itself.
   */
  showGrip?: boolean
}

export const MiniTrackTile = ({
  trackId,
  isPlaying = false,
  isActive = false,
  onPlay,
  onRemove,
  onMore,
  onTitleClick,
  showHoverActions = false,
  showGrip = false
}: MiniTrackTileProps) => {
  const { color, cornerRadius } = useTheme()
  const [hovered, setHovered] = useState(false)
  const moreRef = useRef<HTMLButtonElement>(null)

  const { data: track } = useTrack(trackId, {
    select: (t) => ({
      title: t?.title,
      ownerId: t?.owner_id
    })
  })
  const { imageUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })

  const handleArtworkClick = useCallback(
    (e: MouseEvent) => {
      if (!onPlay) return
      e.stopPropagation()
      onPlay()
    },
    [onPlay]
  )

  const handleMore = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (moreRef.current) onMore?.(moreRef.current)
    },
    [onMore]
  )

  const handleRemove = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      onRemove?.()
    },
    [onRemove]
  )

  const showActions = showHoverActions && hovered
  const showOverlay = isActive || (hovered && !!onPlay)

  return (
    <Flex
      direction='row'
      alignItems='center'
      gap='m'
      pv='s'
      pl={showGrip ? 'm' : 's'}
      pr={showActions ? 'l' : 's'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      borderRadius='m'
      css={{
        position: 'relative',
        backgroundColor: showActions
          ? color.background.surface1
          : 'transparent',
        border: `1px solid ${
          showActions ? color.border.default : 'transparent'
        }`,
        cursor: showGrip ? 'grab' : onTitleClick ? 'pointer' : 'default',
        transition:
          'background-color 120ms ease-out, border-color 120ms ease-out',
        ':active': showGrip ? { cursor: 'grabbing' } : undefined
      }}
      onClick={onTitleClick}
    >
      {showGrip ? (
        <div
          aria-hidden='true'
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: hovered ? 1 : 0.6,
            transition: 'opacity 120ms ease-out',
            pointerEvents: 'none'
          }}
        >
          <IconDrag size='s' color='subdued' />
        </div>
      ) : null}
      <Flex
        css={{
          position: 'relative',
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: cornerRadius.xs,
          overflow: 'hidden',
          cursor: onPlay ? 'pointer' : 'default'
        }}
        onClick={handleArtworkClick}
      >
        <Image src={imageUrl} />
        {showOverlay && (
          <Flex
            css={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            {isActive && isPlaying ? (
              <IconPause size='m' color='staticWhite' />
            ) : (
              <IconPlay size='m' color='staticWhite' />
            )}
          </Flex>
        )}
      </Flex>

      <Flex
        direction='column'
        justifyContent='center'
        alignItems='flex-start'
        css={{ flex: '1 0 0', minWidth: 0 }}
      >
        <Text
          variant='body'
          size='m'
          strength='strong'
          color={isActive ? 'accent' : 'default'}
          ellipses
          css={{ width: '100%' }}
          onClick={(e) => {
            if (onTitleClick) {
              e.stopPropagation()
              onTitleClick()
            }
          }}
        >
          {track?.title ?? ''}
        </Text>
        {track?.ownerId ? (
          <UserLink
            userId={track.ownerId}
            size='s'
            badgeSize='xs'
            popover={false}
          />
        ) : null}
      </Flex>

      {showActions ? (
        <Flex direction='row' alignItems='center' gap='l'>
          {onRemove ? (
            <IconButton
              icon={IconClose}
              color='subdued'
              size='s'
              aria-label='Remove from queue'
              onClick={handleRemove}
            />
          ) : null}
          {onMore ? (
            <IconButton
              ref={moreRef}
              icon={IconKebabHorizontal}
              color='subdued'
              size='s'
              aria-label='More options'
              onClick={handleMore}
            />
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  )
}
