import { useState, useEffect, useCallback, useRef } from 'react'

import cn from 'classnames'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useChain, useSpring, useTrail, animated } from 'react-spring'

import productShot from 'assets/img/publicSite/ProductShot2.webp'
import dotsLogo1x from 'assets/img/publicSite/dot-logo@1x.jpg'
import dotsLogo2x from 'assets/img/publicSite/dot-logo@2x.jpg'

import styles from './Description.module.css'
const animatedAny = animated as any

const messages = {
  title: 'The Music Industry Hard Fork',
  description: `Audius is music done right. It's a community-run music platform that connects artists and fans directly. Fans and artists build communities together around music, and developers build anything they want on their terms.`
}

const titleItems = messages.title.split(' ')

type DescriptionProps = {
  isMobile: boolean
}

const Description = (props: DescriptionProps) => {
  const [hasViewed, setHasViewed] = useState(false)

  const startAnimation = useRef<HTMLDivElement | null>(null)
  const refInView = useCallback(() => {
    if (startAnimation.current) {
      const refBounding = startAnimation.current.getBoundingClientRect()
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const elementTop = refBounding.top + scrollTop
      const windowScrollingBottom = window.innerHeight + scrollTop
      if (elementTop < windowScrollingBottom) {
        setHasViewed(true)
      }
    }
    return false
  }, [])

  const setStartAnimation = useCallback(
    (node: HTMLHeadingElement) => {
      startAnimation.current = node
      refInView()
    },
    [refInView]
  )

  const titleRef = useRef<HTMLHeadingElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  const titleTrail = useTrail(titleItems.length, {
    // @ts-ignore
    ref: titleRef,
    config: { mass: 3, tension: 2000, friction: 200 },
    to: { opacity: 1, x: 0 },
    from: { opacity: 0, x: 80 }
  })

  // @ts-ignore
  const bodyStyles = useSpring({
    // @ts-ignore
    ref: bodyRef,
    config: { mass: 3, tension: 2000, friction: 500 },
    to: { opacity: 1, x: 0 },
    from: { opacity: 0, x: 120 }
  })

  // @ts-ignore
  useChain(hasViewed ? [titleRef, bodyRef] : [], [0, 0.7])

  useEffect(() => {
    refInView()
    window.addEventListener('scroll', refInView)
    return () => window.removeEventListener('scroll', refInView)
  }, [refInView])

  const wordGradients = [
    styles.gradient1,
    styles.gradient2,
    styles.gradient3,
    styles.gradient4,
    styles.gradient5
  ]

  if (props.isMobile) {
    return (
      <div className={styles.mobileContainer}>
        <div className={styles.textSection}>
          <img
            src={productShot}
            srcSet={`${productShot} 2x`}
            className={styles.productShot}
            alt='Audius Product Shot'
          />
          <h3 ref={setStartAnimation} className={styles.titleColor}>
            {titleTrail.map(
              ({ x, wordYPosition, ...rest }: any, index: number) => (
                <animatedAny.span
                  key={titleItems[index]}
                  className={cn(cn(styles.textAnimate))}
                  // @ts-ignore
                  style={{
                    ...rest,
                    transform: x.interpolate(
                      (x: number) => `translate3d(0,${x}px,0)`
                    )
                  }}
                >
                  <animatedAny.div
                    className={cn(
                      styles.word,
                      styles.coloredTitleWord,
                      wordGradients[index]
                    )}
                  >
                    {' '}
                    {titleItems[index]}{' '}
                  </animatedAny.div>
                </animatedAny.span>
              )
            )}
          </h3>
          <animatedAny.div
            className={styles.textDescription}
            style={{
              // @ts-ignore
              opacity: bodyStyles.opacity,
              // @ts-ignore
              transform: bodyStyles.x.interpolate(
                (x: number) => `translate3d(0,${x}px,0)`
              )
            }}
          >
            <div className={cn(styles.description)}>
              <p>{messages.description}</p>
            </div>
          </animatedAny.div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img
          src={dotsLogo1x}
          srcSet={`${dotsLogo1x} 1x, ${dotsLogo2x} 2x`}
          className={cn(styles.dotsLogo, styles.dotsLeft)}
          alt='Background moving dot pattern 1'
        />
        <div className={styles.foreground}>
          <img
            src={productShot}
            srcSet={`${productShot} 2x`}
            className={styles.productShot}
            alt='Audius Mobile Product Shot'
          />
          <h3 ref={setStartAnimation} className={styles.coloredTitle}>
            {titleTrail.map(
              ({ x, wordYPosition, ...rest }: any, index: number) => (
                <animatedAny.span
                  key={titleItems[index]}
                  className={cn(cn(styles.textAnimate))}
                  // @ts-ignore
                  style={{
                    ...rest,
                    transform: x.interpolate(
                      (x: number) => `translate3d(0,${x}px,0)`
                    )
                  }}
                >
                  <animatedAny.div
                    className={cn(
                      styles.word,
                      styles.coloredTitleWord,
                      wordGradients[index]
                    )}
                  >
                    {' '}
                    {titleItems[index]}{' '}
                  </animatedAny.div>
                </animatedAny.span>
              )
            )}
          </h3>
          <animatedAny.div
            className={styles.descriptionBody}
            style={{
              // @ts-ignore
              opacity: bodyStyles.opacity,
              // @ts-ignore
              transform: bodyStyles.x.interpolate(
                (x: number) => `translate3d(0,${x}px,0)`
              )
            }}
          >
            <div className={cn(styles.subText, styles.description)}>
              {messages.description}
            </div>
          </animatedAny.div>
        </div>
        <img
          src={dotsLogo1x}
          srcSet={`${dotsLogo1x} 1x, ${dotsLogo2x} 2x`}
          className={cn(styles.dotsLogo, styles.dotsRight)}
          alt='Background moving dot pattern 2'
        />
      </div>
    </div>
  )
}

export default Description
