import { forwardRef, useCallback, useEffect, useRef, useState } from 'react'

import {
  Flex,
  IconButton,
  IconCaretLeft,
  IconCaretRight,
  Text,
  PlainButton
} from '@audius/harmony'
import { Link } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'

export type CarouselProps = {
  title: React.ReactNode
  children: React.ReactNode
  viewAllLink?: string
}

const FADE_LENGTH_PX = 64

const getFadeMask = (canScrollLeft: boolean, canScrollRight: boolean) => {
  const leftStop = canScrollLeft
    ? `transparent 0, black ${FADE_LENGTH_PX}px`
    : 'black 0'
  const rightStop = canScrollRight
    ? `black calc(100% - ${FADE_LENGTH_PX}px), transparent 100%`
    : 'black 100%'
  return `linear-gradient(to right, ${leftStop}, ${rightStop})`
}

export const Carousel = forwardRef<HTMLDivElement, CarouselProps>(
  ({ title, children, viewAllLink }, ref) => {
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const rafRef = useRef<number | null>(null)
    const isMobile = useIsMobile()

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
    const handleScrollBy = useCallback(
      (direction: -1 | 1) => {
        const container = scrollContainerRef.current
        if (!container) return

        // Scroll by nearly one viewport of rail content so nav remains aligned
        // across responsive widths without hardcoded pixel jumps.
        const scrollAmount = Math.max(
          240,
          container.clientWidth - (railInset + contentInset) * 2 - 24
        )
        container.scrollBy({
          left: direction * scrollAmount,
          behavior: 'smooth'
        })
      },
      [railInset]
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

            // Desktop only: fade content into the page at edges when there's
            // more to scroll in that direction. Avoids the abrupt edge of a
            // finite carousel without repeating content. Fade region needs to
            // be deep enough to land on actual card content (cards start
            // ~railInset + contentInset from the scroll-container edge), so
            // we use a fixed length larger than that.
            ...(!isMobile && {
              WebkitMaskImage: getFadeMask(canScrollLeft, canScrollRight),
              maskImage: getFadeMask(canScrollLeft, canScrollRight)
            })
          }}
        >
          <Flex
            gap='m'
            css={{
              minWidth: 'max-content',
              overflow: 'visible',
              paddingLeft: contentInset,
              paddingRight: contentInset
            }}
          >
            {children}
          </Flex>
        </Flex>
      </Flex>
    )
  }
)
