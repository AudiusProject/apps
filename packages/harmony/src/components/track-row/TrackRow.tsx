import { forwardRef, MouseEvent, useCallback } from 'react'

import { css, keyframes, useTheme } from '@emotion/react'

import { IconHeart, IconPause, IconPlay } from '../../icons'
import { IconButton } from '../button'
import { Box } from '../layout/Box'
import { Flex } from '../layout/Flex'
import { Skeleton } from '../skeleton'
import { Text } from '../text'

import type { TrackRowProps } from './types'

const ROW_HEIGHT = 56
const ART_SIZE = 40
// Fits a three-digit rank at the smaller size used from 100 up.
const RANK_SIZE = 32

const REVEAL_CLASS = 'trackRowReveal'
const HIDE_ON_HOVER_CLASS = 'trackRowHideOnHover'

const bounce = keyframes`
  0%, 100% { height: 4px; }
  50% { height: 14px; }
`

/** Three animated bars shown in place of the rank while the row is playing. */
const Equalizer = () => {
  const { color } = useTheme()
  return (
    <Flex
      aria-hidden
      gap='2xs'
      alignItems='flex-end'
      justifyContent='center'
      h={14}
      css={{
        '& > i': {
          display: 'block',
          width: 3,
          borderRadius: 1,
          backgroundColor: color.text.accent,
          animation: `${bounce} 1s ease-in-out infinite`
        },
        '& > i:nth-of-type(2)': { animationDelay: '-0.4s' },
        '& > i:nth-of-type(3)': { animationDelay: '-0.7s' },
        '@media (prefers-reduced-motion: reduce)': {
          '& > i': { animation: 'none', height: 10 }
        }
      }}
    >
      <i />
      <i />
      <i />
    </Flex>
  )
}

/**
 * A dense, single-line track row for lineups: rank · artwork · title and
 * artist · plays · favorite · duration · menu. Fifty-six pixels tall, so a
 * desktop viewport shows ten to twelve tracks instead of three or four tiles.
 *
 * The row is presentational. The app supplies the title and artist nodes
 * (links), the artwork, the formatted numbers and the overflow menu; the row
 * handles layout, hover and playing states, and reveals actions on hover or
 * keyboard focus.
 */
export const TrackRow = forwardRef<HTMLDivElement, TrackRowProps>(
  (props, ref) => {
    const {
      rank,
      artwork,
      title,
      subtitle,
      playCount,
      status,
      duration,
      isActive = false,
      isPlaying = false,
      isFavorited = false,
      isLoading = false,
      isDisabled = false,
      onTogglePlay,
      onToggleFavorite,
      menu,
      context,
      playLabel = isPlaying ? 'Pause' : 'Play',
      favoriteLabel = isFavorited ? 'Unfavorite' : 'Favorite',
      className,
      ...other
    } = props
    const { color, cornerRadius, motion, spacing, typography } = useTheme()

    const isInteractive = !isLoading && !isDisabled

    // Clicks on links, buttons and the menu belong to those controls; any
    // other click on the row toggles playback, like the tile does.
    const handleRowClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        if (!isInteractive) return
        const target = event.target as Element
        if (target.closest('a, button, [role="menu"], [data-row-control]')) {
          return
        }
        onTogglePlay?.()
      },
      [isInteractive, onTogglePlay]
    )

    const handlePlayClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onTogglePlay?.()
      },
      [onTogglePlay]
    )

    const handleFavoriteClick = useCallback(
      (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation()
        onToggleFavorite?.()
      },
      [onToggleFavorite]
    )

    // Title column starts after the rank and artwork cells and two gaps.
    const contextCss = css({
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xs,
      height: 16,
      marginTop: spacing.xs,
      paddingLeft: spacing.s + RANK_SIZE + ART_SIZE + spacing.m * 2
    })

    const rowCss = css({
      display: 'grid',
      gridTemplateColumns: `${RANK_SIZE}px ${ART_SIZE}px minmax(0, 1fr) auto 32px 48px 32px`,
      alignItems: 'center',
      columnGap: spacing.m,
      height: ROW_HEIGHT,
      paddingLeft: spacing.s,
      paddingRight: spacing.s,
      borderRadius: cornerRadius.m,
      cursor: isInteractive ? 'pointer' : 'default',
      opacity: isDisabled ? 0.5 : 1,
      transition: `background-color ${motion.hover}`,
      [`& .${REVEAL_CLASS}`]: {
        opacity: 0,
        transition: `opacity ${motion.hover}`
      },
      ...(isInteractive && {
        '&:hover, &:focus-within': {
          backgroundColor: color.background.surface1,
          [`& .${REVEAL_CLASS}`]: { opacity: 1 },
          [`& .${HIDE_ON_HOVER_CLASS}`]: { opacity: 0 }
        }
      })
    })

    // The numeral, the equalizer and the play button share one grid cell so
    // they stack dead-center and cross-fade on hover.
    const rankCss = css({
      display: 'grid',
      placeItems: 'center',
      height: '100%',
      '& > *': { gridArea: '1 / 1' }
    })

    const numeralCss = css({
      fontVariantNumeric: 'tabular-nums',
      textAlign: 'right',
      whiteSpace: 'nowrap'
    })

    const rankFace = css({
      transition: `opacity ${motion.hover}`
    })

    if (isLoading) {
      return (
        <div ref={ref} css={rowCss} className={className} aria-busy {...other}>
          <Box />
          <Skeleton w={ART_SIZE} h={ART_SIZE} borderRadius='s' />
          <Flex direction='column' gap='xs' css={{ minWidth: 0 }}>
            <Skeleton w='45%' h={14} />
            <Skeleton w='28%' h={12} />
          </Flex>
          <Skeleton w={36} h={12} />
          <Box />
          <Skeleton w={32} h={12} />
          <Box />
        </div>
      )
    }

    const showEqualizer = isActive && isPlaying
    const PlayIcon = showEqualizer ? IconPause : IconPlay

    const row = (
      <div
        ref={context ? undefined : ref}
        css={rowCss}
        className={context ? undefined : className}
        onClick={handleRowClick}
        aria-current={isActive ? 'true' : undefined}
        {...(context ? {} : other)}
      >
        <div css={rankCss}>
          {rank != null && !showEqualizer ? (
            <Text
              variant='title'
              size={rank >= 100 ? 'm' : 'l'}
              strength='strong'
              color='default'
              className={HIDE_ON_HOVER_CLASS}
              css={rankFace}
            >
              {rank}
            </Text>
          ) : null}
          {showEqualizer ? (
            <span className={HIDE_ON_HOVER_CLASS}>
              <Equalizer />
            </span>
          ) : null}
          {isInteractive && onTogglePlay ? (
            <IconButton
              size='s'
              icon={PlayIcon}
              color='default'
              aria-label={playLabel}
              onClick={handlePlayClick}
              className={REVEAL_CLASS}
              css={{ '&:focus-visible': { opacity: 1 } }}
            />
          ) : null}
        </div>

        <Box
          w={ART_SIZE}
          h={ART_SIZE}
          borderRadius='s'
          css={{
            overflow: 'hidden',
            backgroundColor: color.background.surface2
          }}
        >
          {artwork}
        </Box>

        <Flex direction='column' css={{ minWidth: 0 }}>
          <Text
            variant='body'
            size='m'
            strength='strong'
            color={isActive ? 'accent' : 'default'}
            ellipses
            css={{ fontWeight: typography.weight.medium }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text variant='body' size='s' color='subdued' ellipses>
              {subtitle}
            </Text>
          ) : null}
        </Flex>

        <Flex alignItems='center' justifyContent='flex-end' gap='m'>
          {status}
          {playCount ? (
            <Text variant='body' size='xs' color='subdued' css={numeralCss}>
              {playCount}
            </Text>
          ) : null}
        </Flex>

        <Flex justifyContent='center'>
          {onToggleFavorite ? (
            <IconButton
              size='s'
              icon={IconHeart}
              color={isFavorited ? 'active' : 'subdued'}
              aria-label={favoriteLabel}
              aria-pressed={isFavorited}
              onClick={handleFavoriteClick}
              className={isFavorited ? undefined : REVEAL_CLASS}
              css={{ '&:focus-visible': { opacity: 1 } }}
            />
          ) : null}
        </Flex>

        <Text variant='body' size='xs' color='subdued' css={numeralCss}>
          {duration ?? ''}
        </Text>

        <Flex
          justifyContent='center'
          className={REVEAL_CLASS}
          data-row-control
          css={{ '&:focus-within': { opacity: 1 } }}
        >
          {menu}
        </Flex>
      </div>
    )

    if (!context) return row

    return (
      <div ref={ref} className={className} {...other}>
        <Text variant='body' size='xs' color='subdued' css={contextCss}>
          {context}
        </Text>
        {row}
      </div>
    )
  }
)
