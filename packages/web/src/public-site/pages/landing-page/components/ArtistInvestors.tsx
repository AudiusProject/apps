import { route } from '@audius/common/src/utils'
import { TextLink } from '@audius/harmony'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import investorKatyPerry from 'assets/img/publicSite/Investor-Katy-Perry.webp'
import investorNas from 'assets/img/publicSite/Investor-Nas.webp'
import investorPushaT from 'assets/img/publicSite/Investor-Pusha-T.webp'
import investorSteveAoki from 'assets/img/publicSite/Investor-Steve-Aoki.webp'
import investorTheChainsmokers from 'assets/img/publicSite/Investor-The-Chainsmokers.webp'
import useHasViewed from 'hooks/useHasViewed'

import styles from './ArtistInvestors.module.css'
const animatedAny = animated as any

const messages = {
  title: 'Backed By The Best',
  subtitle:
    'Audius is built by and for the community with an all-star team of music industry and artist backers.',
  joinTheMovement: 'Join the Movement!'
}

type AristProps = {
  name: string
  imageUrl: string
}

const Artist = (props: AristProps) => {
  return (
    <div className={styles.cardMoveContainer}>
      <div className={styles.artistContainer}>
        <div className={styles.artistImageWrapper}>
          <animatedAny.img
            src={props.imageUrl}
            className={styles.artistImage}
          />
        </div>
        <div className={styles.artistName}>{props.name}</div>
      </div>
    </div>
  )
}

const MobileArtist = (props: AristProps) => {
  return (
    <div className={styles.artistCard}>
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
    name: 'Katy Perry',
    imageUrl: investorKatyPerry
  },
  {
    name: 'Nas',
    imageUrl: investorNas
  },
  {
    name: 'The Chainsmokers',
    imageUrl: investorTheChainsmokers
  },
  {
    name: 'Pusha T',
    imageUrl: investorPushaT
  },
  {
    name: 'Steve Aoki',
    imageUrl: investorSteveAoki
  }
]

type ArtistInvestorsProps = {
  isMobile: boolean
}

const ArtistInvestors = (props: ArtistInvestorsProps) => {
  // Animate in the title and subtitle text
  const [hasViewed, refInView] = useHasViewed()
  const titleStyles = useSpring({
    config: { mass: 3, tension: 2000, friction: 500 },
    opacity: hasViewed ? 1 : 0,
    x: hasViewed ? 0 : 120
  })

  if (props.isMobile) {
    return (
      <div className={styles.mobileContainer}>
        <div ref={refInView} className={styles.content}>
          <animatedAny.div
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
          </animatedAny.div>
          <div className={styles.artistsContainer}>
            {artists.map((artist, i) => (
              <MobileArtist key={artist.name} {...artist} />
            ))}
          </div>
          <TextLink
            target='_blank'
            variant='visible'
            textVariant='body'
            css={{ fontSize: '24px' }}
            href={route.SIGN_UP_PAGE}
          >
            {messages.joinTheMovement}
          </TextLink>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div ref={refInView} className={styles.content}>
        <animatedAny.div
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
        </animatedAny.div>
        <div className={styles.artistsContainer}>
          {artists.map((artist) => (
            <Artist key={artist.name} {...artist} />
          ))}
        </div>
        <TextLink
          target='_blank'
          variant='visible'
          textVariant='body'
          css={{ fontSize: '24px' }}
          href={route.SIGN_UP_PAGE}
        >
          {messages.joinTheMovement}
        </TextLink>
      </div>
    </div>
  )
}

export default ArtistInvestors
