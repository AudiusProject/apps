// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useCallback } from 'react'

// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import artistAluna from 'assets/img/publicSite/Artist-Aluna.webp'
import artistDeadmau5 from 'assets/img/publicSite/Artist-Deadmau5.webp'
import artistDiplo from 'assets/img/publicSite/Artist-Diplo.webp'
import artistKennyBeats from 'assets/img/publicSite/Artist-Kenny-Beats.webp'
import artistLoloZouai from 'assets/img/publicSite/Artist-Lolo-Zouai.webp'
import artistMattOX from 'assets/img/publicSite/Artist-Matt-OX.webp'
import artistRezz from 'assets/img/publicSite/Artist-Rezz.webp'
import artistSkrillex from 'assets/img/publicSite/Artist-Skrillex.webp'
import artistZedd from 'assets/img/publicSite/Artist-Zedd.webp'
import useHasViewed from 'hooks/useHasViewed'

import styles from './WhoUsesAudius.module.css'

const messages = {
  title: 'Who Uses Audius?',
  subtitle:
    'Thousands of artists across dozens of genres—including electronic, hip-hop, and more—use Audius to forge unparalleled connections with fans.'
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

const artists = [
  {
    name: 'deadmau5',
    handle: 'deadmau5',
    imageUrl: artistDeadmau5
  },
  {
    name: 'Skrillex',
    handle: 'skrillex',
    imageUrl: artistSkrillex
  },
  {
    name: 'Zedd',
    handle: 'zedd',
    imageUrl: artistZedd
  },
  {
    name: 'Kenny Beats',
    handle: 'kennybeats',
    imageUrl: artistKennyBeats
  },
  {
    name: 'Matt OX',
    handle: 'mattox',
    imageUrl: artistMattOX
  },
  {
    name: 'Aluna',
    handle: 'alunaaa',
    imageUrl: artistAluna
  },
  {
    name: 'Diplo',
    handle: 'diplo',
    imageUrl: artistDiplo
  },
  {
    name: 'Lolo Zouai',
    handle: 'lolozouai',
    imageUrl: artistLoloZouai
  },
  {
    name: 'Rezz',
    handle: 'officialrezz',
    imageUrl: artistRezz
  }
]

type WhoUsesAudiusProps = {
  isMobile: boolean
}

const WhoUsesAudius = (props: WhoUsesAudiusProps) => {
  // Animate in the title and subtitle text
  const [hasViewed, refInView] = useHasViewed()
  const titleStyles = useSpring({
    config: { mass: 3, tension: 2000, friction: 500 },
    opacity: hasViewed ? 1 : 0,
    x: hasViewed ? 0 : 120
  })

  const goToArtist = useCallback((handle: string) => {
    window.open(`https://audius.co/${handle}`, '_blank')
  }, [])

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
          {artists.map((artist, i) => (
            <MobileArtist
              key={artist.handle}
              {...artist}
              goToArtist={goToArtist}
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
          {artists.map((artist) => (
            <Artist key={artist.handle} {...artist} goToArtist={goToArtist} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default WhoUsesAudius
