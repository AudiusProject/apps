import { useState, useCallback, useRef, useEffect } from 'react'

import { coinPage } from '@audius/common/src/utils/route'
import { IconCaretRight } from '@audius/harmony'
import cn from 'classnames'
import { Parallax } from 'react-scroll-parallax'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useChain, useTrail, animated } from 'react-spring'

import { useHistoryContext } from 'app/HistoryProvider'
import ctaSectionTakeover from 'assets/img/publicSite/CTASectionTakeover.webp'
import { handleClickRoute } from 'public-site/components/handleClickRoute'
import { useMatchesBreakpoint } from 'utils/useMatchesBreakpoint'

import styles from './CTAGetStarted.module.css'

const MOBILE_WIDTH_MEDIA_QUERY = window.matchMedia('(max-width: 1150px)')

const messages = {
  title: 'You Already Know',
  cta: 'Get Started'
}

const titleItems = messages.title.split(' ')

type CTAGetStartedProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

const CTAGetStarted = (props: CTAGetStartedProps) => {
  const { history } = useHistoryContext()
  const isNarrow = useMatchesBreakpoint({
    initialValue: props.isMobile,
    mediaQuery: MOBILE_WIDTH_MEDIA_QUERY
  })
  const [hasViewed, setHasViewed] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)

  const refInView = useCallback(() => {
    if (containerRef.current) {
      const refBounding = (containerRef.current as any).getBoundingClientRect()
      if (refBounding.top < window.innerHeight * 0.9) {
        setHasViewed(true)
      }
    }
    return false
  }, [setHasViewed])

  const titleRef = useRef()

  const titleSpring = useTrail(titleItems.length, {
    // @ts-ignore
    ref: titleRef,
    config: { mass: 3, tension: 2000, friction: 200 },
    to: { opacity: 1, x: 0 },
    from: { opacity: 0, x: 80 }
  })

  // @ts-ignore
  useChain(hasViewed ? [titleRef] : [], [0, 0.8])

  useEffect(() => {
    refInView()
    window.addEventListener('scroll', refInView)
    return () => window.removeEventListener('scroll', refInView)
  }, [refInView])

  if (props.isMobile || isNarrow) {
    return (
      <div className={styles.mobileContainer}>
        <div className={styles.bgContainer}>
          <div className={styles.parallaxBg}></div>
          <Parallax className={cn(styles.mobileBgImage)} translateY={[-100, 0]}>
            <img
              className={styles.mobileBackground}
              srcSet={`
              ${ctaSectionTakeover} 1x,
              ${ctaSectionTakeover} 2x,
              ${ctaSectionTakeover} 3x,
              `}
              src={ctaSectionTakeover}
              alt='Audius Audio Set'
            />
          </Parallax>
        </div>
        <div className={styles.textContent}>
          <div className={styles.title}>{messages.title}</div>
          <button
            onClick={handleClickRoute(
              coinPage('YAK'),
              props.setRenderPublicSite,
              history
            )}
            className={styles.ctaButton}
          >
            {messages.cta}
            <IconCaretRight className={styles.iconCaretRight} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.content}>
        <div className={styles.textContent}>
          <div className={styles.titleContainer}>
            <h3 className={styles.title}>
              {titleSpring.map(
                ({ x, wordYPosition, ...rest }: any, index: number) => (
                  <animated.span
                    key={index}
                    className={cn(styles.textAnimateTitle)}
                    style={{
                      ...rest,
                      transform: x.interpolate(
                        (x: number) => `translate3d(0,${x}px,0)`
                      )
                    }}
                  >
                    <animated.div
                      className={cn(styles.word, styles.coloredTitleWord)}
                    >
                      {' '}
                      {titleItems[index]}{' '}
                    </animated.div>
                  </animated.span>
                )
              )}
            </h3>
          </div>
          <button
            onClick={handleClickRoute(
              coinPage('YAK'),
              props.setRenderPublicSite,
              history
            )}
            className={styles.ctaButton}
          >
            {messages.cta}
            <IconCaretRight className={styles.iconCaretRight} color='accent' />
          </button>
        </div>
      </div>
      <div className={styles.bgContainer}>
        <div className={styles.parallaxBg}></div>
        <Parallax className={cn(styles.bgParallax)} translateY={[-20, 20]}>
          <img
            className={styles.background}
            srcSet={`
            ${ctaSectionTakeover} 1x,
            ${ctaSectionTakeover} 2x,
            ${ctaSectionTakeover} 3x,
            `}
            src={ctaSectionTakeover}
            alt='Audius Audio Set'
          />
        </Parallax>
      </div>
    </div>
  )
}

export default CTAGetStarted
