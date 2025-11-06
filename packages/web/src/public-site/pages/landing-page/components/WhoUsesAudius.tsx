// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useCallback } from 'react'

import { coinPage } from '@audius/common/src/utils/route'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import { useHistoryContext } from 'app/HistoryProvider'
import artistTakeover from 'assets/img/publicSite/Artist-Takeover.webp'
import useHasViewed from 'hooks/useHasViewed'
import { handleClickRoute } from 'public-site/components/handleClickRoute'

import styles from './WhoUsesAudius.module.css'

const messages = {
  title: 'Who Uses Audius?',
  subtitle:
    'Hundreds of thousands of artists across dozens of genres—including electronic, hip-hop, and more—use Audius to forge deep relationships with fans.'
}

type AristProps = {
  name: string
  handle: string
  imageUrl: string
  goToArtist: (handle: string) => void
}

const Artist = (props: AristProps) => {
  return (
    <div
      className={styles.cardMoveContainer}
      onClick={() => props.goToArtist(props.handle)}
    >
      <div className={styles.artistContainer}>
        <div className={styles.artistImageWrapper}>
          <animated.img src={props.imageUrl} className={styles.artistImage} />
        </div>
        <div className={styles.artistName}>{props.name}</div>
      </div>
    </div>
  )
}

const MobileArtist = (props: AristProps) => {
  return (
    <div
      className={styles.artistCard}
      onClick={() => props.goToArtist(props.handle)}
    >
      <div className={styles.artistImageWrapper}>
        <img
          src={props.imageUrl}
          className={styles.artistImage}
          alt='Audius Artist'
        />
      </div>
      <div className={styles.artistName}>{props.name}</div>
    </div>
  )
}

const takeoverArtists = ['You', 'Already', 'Know', 'YAK'].map((name) => ({
  name,
  handle: 'handle', // TODO: add handle
  imageUrl: artistTakeover
}))

type WhoUsesAudiusProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

const WhoUsesAudius = (props: WhoUsesAudiusProps) => {
  const { history } = useHistoryContext()

  // Animate in the title and subtitle text
  const [hasViewed, refInView] = useHasViewed()
  const titleStyles = useSpring({
    config: { mass: 3, tension: 2000, friction: 500 },
    opacity: hasViewed ? 1 : 0,
    x: hasViewed ? 0 : 120
  })

  // const goToArtist = useCallback((handle: string) => {
  //   window.open(`https://audius.co/${handle}`, '_blank')
  // }, [])

  const goToCoinPage = useCallback(() => {
    // NOTE: Curried function
    handleClickRoute(coinPage('YAK'), props.setRenderPublicSite, history)()
  }, [history, props.setRenderPublicSite])

  if (props.isMobile) {
    return (
      <div className={styles.mobileContainer}>
        <div ref={refInView} className={styles.content}>
          <div className={styles.animateTitleContainer}>
            <animated.div
              style={{
                opacity: titleStyles.opacity,
                transform: titleStyles.x.interpolate(
                  (x) => `translate3d(0,${x}px,0)`
                ),
                width: '100%'
              }}
            >
              <h3 className={styles.title}>{messages.title}</h3>
              <h3 className={styles.subTitle}>{messages.subtitle}</h3>
            </animated.div>
          </div>
        </div>
        <div className={styles.artistsContainer}>
          {takeoverArtists.map((artist, i) => (
            <MobileArtist
              key={artist.name}
              {...artist}
              goToArtist={goToCoinPage}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div ref={refInView} className={styles.content}>
        <animated.div
          style={{
            opacity: titleStyles.opacity,
            transform: titleStyles.x.interpolate(
              (x) => `translate3d(0,${x}px,0)`
            ),
            width: '100%'
          }}
        >
          <h3 className={styles.title}>{messages.title}</h3>
          <h3 className={styles.subTitle}>{messages.subtitle}</h3>
        </animated.div>
        <div className={styles.artistsContainer}>
          {takeoverArtists.map((artist) => (
            <Artist key={artist.name} {...artist} goToArtist={goToCoinPage} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default WhoUsesAudius
