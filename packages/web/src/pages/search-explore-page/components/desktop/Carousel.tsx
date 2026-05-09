import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

import {
  Box,
  Flex,
  IconButton,
  IconCaretLeft,
  IconCaretRight,
  Text,
  PlainButton,
  useTheme
} from '@audius/harmony'
import { Link } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'

export type CarouselProps = {
  title: React.ReactNode
  children: React.ReactNode
  viewAllLink?: string
}

const FADE_LENGTH_PX = 24
const SCROLL_DURATION_MS = 320
// scroll-margin-left applied to every non-first card so the prior card peeks
// at the left edge during snap. Mirrored in CSS below; duplicated as a JS
// constant so the caret-press animation can compute the exact snap-aligned
// scrollLeft target and avoid the snap-back "jump" at the end of animation.
const NON_FIRST_SNAP_MARGIN_PX = 40

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  ({ title, children, viewAllLink }, ref) => {
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number | null>(null)
    const animRef = useRef<number | null>(null)
    const isMobile = useIsMobile()
    const theme = useTheme()
    const pageBg = theme.color.background.default

    const updateScrollButtons = useCallback(() => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const container = scrollContainerRef.current
        if (container) {
          setCanScrollLeft(container.scrollLeft > 0)
          setCanScrollRight(
            container.scrollLeft + container.clientWidth <
              container.scrollWidth - 1
          )
        }
      })
    }, [])

    useEffect(() => {
      const container = scrollContainerRef.current
      if (!container) return

      updateScrollButtons()
      container.addEventListener('scroll', updateScrollButtons)
      window.addEventListener('resize', updateScrollButtons)

      return () => {
        container.removeEventListener('scroll', updateScrollButtons)
        window.removeEventListener('resize', updateScrollButtons)
      }
    }, [updateScrollButtons])

    const railInset = isMobile ? 16 : 18
    const contentInset = 8
    // Scroll containers clip overflow; keep a generous internal vertical buffer
    // so card shadows (including hover states) are not cut between carousels.
    const railShadowPaddingTop = isMobile ? 12 : 10
    const railShadowPaddingBottom = isMobile ? 12 : 20

    // JS-driven smooth scroll for caret presses. Native smooth scroll +
    // scroll-snap fight each other in this layout, so we rAF-drive scrollLeft
    // directly with ease-out. We disable snap for the duration of the
    // animation, but pre-compute the exact snap-aligned scrollLeft target so
    // that when snap re-engages at the end, the browser sees we're already
    // aligned and doesn't pull anywhere — no end-of-animation jump.
    const handleScrollBy = useCallback(
      (direction: -1 | 1) => {
        const container = scrollContainerRef.current
        if (!container) return
        const innerRail = container.firstElementChild as HTMLElement | null
        if (!innerRail) return
        if (animRef.current !== null) {
          cancelAnimationFrame(animRef.current)
          animRef.current = null
        }

        const scrollPaddingLeft = railInset + contentInset
        const start = container.scrollLeft
        const maxScroll = container.scrollWidth - container.clientWidth
        const containerLeft = container.getBoundingClientRect().left

        // Build the list of snap-aligned scrollLeft positions, one per card.
        // Mirrors the CSS snap rules: padding on the container, plus
        // scroll-margin-left on every non-first card.
        const cards = Array.from(innerRail.children) as HTMLElement[]
        const snapPositions = cards.map((card, i) => {
          const cardLeftInContainer =
            card.getBoundingClientRect().left - containerLeft + start
          const cardMargin = i === 0 ? 0 : NON_FIRST_SNAP_MARGIN_PX
          return Math.max(
            0,
            Math.min(
              cardLeftInContainer - cardMargin - scrollPaddingLeft,
              maxScroll
            )
          )
        })

        // Pick the snap position closest to where a viewport-sized scroll in
        // the requested direction would have landed.
        const desiredDistance = Math.max(
          240,
          container.clientWidth - scrollPaddingLeft * 2 - 24
        )
        const desiredTarget = Math.max(
          0,
          Math.min(start + direction * desiredDistance, maxScroll)
        )
        let target = desiredTarget
        let bestDist = Infinity
        for (const pos of snapPositions) {
          // Skip snap targets in the wrong direction (with a small epsilon so
          // we don't get stuck at the current position).
          if (direction === 1 && pos <= start + 1) continue
          if (direction === -1 && pos >= start - 1) continue
          const dist = Math.abs(pos - desiredTarget)
          if (dist < bestDist) {
            bestDist = dist
            target = pos
          }
        }

        const startTime = performance.now()
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
        const previousSnapType = container.style.scrollSnapType
        container.style.scrollSnapType = 'none'
        const tick = (now: number) => {
          const elapsed = now - startTime
          const progress = Math.min(elapsed / SCROLL_DURATION_MS, 1)
          container.scrollLeft = start + (target - start) * easeOut(progress)
          if (progress < 1) {
            animRef.current = requestAnimationFrame(tick)
          } else {
            animRef.current = null
            // We landed exactly on a snap-aligned scrollLeft; restoring snap
            // here is a no-op for the browser.
            container.style.scrollSnapType = previousSnapType
          }
        }
        animRef.current = requestAnimationFrame(tick)
      },
      [railInset]
    )

    useEffect(
      () => () => {
        if (animRef.current !== null) {
          cancelAnimationFrame(animRef.current)
        }
      },
      []
    )

    return (
      <Flex ref={ref} direction='column' gap={isMobile ? 'l' : 'l'} w='100%'>
        <Flex
          gap='m'
          alignItems='center'
          alignSelf='stretch'
          justifyContent='space-between'
          ph={isMobile ? 'l' : undefined}
        >
          <Text
            variant={isMobile ? 'title' : 'heading'}
            size={isMobile ? 'l' : 'm'}
            css={
              isMobile
                ? undefined
                : {
                    fontSize: 'clamp(1.375rem, 2.6vw, 1.5rem)',
                    lineHeight: 'clamp(1.875rem, 3vw, 2rem)'
                  }
            }
          >
            {title}
          </Text>
          {canScrollLeft || canScrollRight || viewAllLink ? (
            <Flex
              gap='l'
              alignItems='center'
              css={
                isMobile
                  ? undefined
                  : { flexShrink: 0, minWidth: 'max-content' }
              }
            >
              {viewAllLink && (
                <PlainButton size={isMobile ? 'default' : 'large'} asChild>
                  <Link to={viewAllLink}>View All</Link>
                </PlainButton>
              )}
              {!isMobile && (
                <Flex gap='l' css={{ flexShrink: 0 }}>
                  <Flex css={{ flexShrink: 0 }}>
                    <IconButton
                      ripple
                      icon={IconCaretLeft}
                      color={canScrollLeft ? 'default' : 'disabled'}
                      aria-label={`${title} scroll left`}
                      onClick={() => {
                        handleScrollBy(-1)
                      }}
                    />
                  </Flex>
                  <Flex css={{ flexShrink: 0 }}>
                    <IconButton
                      ripple
                      icon={IconCaretRight}
                      color={canScrollRight ? 'default' : 'disabled'}
                      aria-label={`${title} scroll right`}
                      onClick={() => {
                        handleScrollBy(1)
                      }}
                    />
                  </Flex>
                </Flex>
              )}
            </Flex>
          ) : null}
        </Flex>
        <Box css={{ position: 'relative' }}>
          <Flex
            ref={scrollContainerRef}
            css={{
              overflowX: 'auto',

              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE/Edge
              '&::-webkit-scrollbar': {
                display: 'none' // Chrome/Safari
              },
              overscrollBehaviorX: 'contain', // prevents back gesture on chrome

              // Keep edge clipping behavior while preserving room for card shadows.
              marginLeft: -railInset,
              marginRight: -railInset,
              paddingLeft: railInset,
              paddingRight: railInset,
              paddingTop: railShadowPaddingTop,
              paddingBottom: railShadowPaddingBottom,

              // Magnetic settle for user-driven scrolling. The caret-press
              // animation disables this for its duration so it doesn't fight
              // the rAF-driven scrollLeft updates.
              scrollSnapType: 'x proximity',
              // The first card sits `railInset + contentInset` inside the
              // scroll container's padding box; matching scroll-padding keeps
              // the snapped first card from getting pulled past the visible
              // edge.
              scrollPaddingLeft: railInset + contentInset
            }}
          >
            <Flex
              gap='m'
              css={{
                minWidth: 'max-content',
                overflow: 'visible',
                paddingLeft: contentInset,
                paddingRight: contentInset,
                '& > *': { scrollSnapAlign: 'start' },
                // For non-first cards, push the snap point inward so the prior
                // card peeks at the left edge (and catches the fade overlay)
                // rather than being scrolled fully off-screen.
                '& > * + *': {
                  scrollMarginLeft: `${NON_FIRST_SNAP_MARGIN_PX}px`
                }
              }}
            >
              {children}
            </Flex>
          </Flex>
          {/* Edge-fade overlays (desktop only). Always mounted; visibility is
              driven by opacity transitions instead of conditional rendering so
              we don't remount the gradient div every time canScrollLeft /
              canScrollRight flip (which can happen rapidly during snap
              settling and was causing the overlay flicker). */}
          {!isMobile ? (
            <>
              <Box
                aria-hidden
                css={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: FADE_LENGTH_PX,
                  background: `linear-gradient(to right, ${pageBg}, transparent)`,
                  pointerEvents: 'none',
                  opacity: canScrollLeft ? 1 : 0,
                  transition: 'opacity 150ms ease-out'
                }}
              />
              <Box
                aria-hidden
                css={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  width: FADE_LENGTH_PX,
                  background: `linear-gradient(to left, ${pageBg}, transparent)`,
                  pointerEvents: 'none',
                  opacity: canScrollRight ? 1 : 0,
                  transition: 'opacity 150ms ease-out'
                }}
              />
            </>
          ) : null}
        </Box>
      </Flex>
    )
  }
)
