import { ReactNode } from 'react'

import { IconAllTime, IconCart, IconUserGroup, IconGift } from '@audius/harmony'
import cn from 'classnames'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import productShot from 'assets/img/publicSite/ProductShot3.webp'
import useHasViewed from 'hooks/useHasViewed'

import styles from './PlatformFeatures.module.css'
const animatedAny = animated as any

const messages = {
  title: ' Empowering Features for Artists',
  subTitle:
    'Take control of your music with the growing list of artist-centric features on Audius.'
}

type FeatureProps = {
  title: string
  description: string | ReactNode
  icon: ReactNode
}

const features: Array<Omit<FeatureProps, 'iconPosition'>> = [
  {
    title: 'Free Unlimited Uploads & No Ads',
    description:
      'Free to use, with no limitations on uploads and a completely ad-free experience.',
    icon: (
      <div className={styles.featureIconContainer}>
        <IconAllTime size='xl' className={styles.allTimeIcon} />
      </div>
    )
  },
  {
    title: 'Grow Your Fanbase',
    description:
      'With Remix Contests, direct messaging, comments, and more. Audius gives you the tools to build a thriving fan community.',
    icon: (
      <div className={styles.featureIconContainer}>
        <IconCart size='xl' className={styles.cartIcon} />
      </div>
    )
  },
  {
    title: 'Sell Your Beats, Stems, & More',
    description:
      'Take advantage of features like premium download gates, and earn bonus rewards with every sale!',
    icon: (
      <div className={styles.featureIconContainer}>
        <IconUserGroup size='xl' className={styles.fanbaseIcon} />
      </div>
    )
  },
  {
    title: 'Earn Token Rewards',
    description:
      'Earn $AUDIO token rewards by completing achievements or winning weekly competitions!',
    icon: (
      <div className={styles.featureIconContainer}>
        <IconGift size='xl' className={styles.giftIcon} />
      </div>
    )
  }
]

type PlatformFeaturesProps = {
  isMobile: boolean
}

const Feature = (props: FeatureProps & PlatformFeaturesProps) => {
  return (
    <div className={cn(styles.feature, { [styles.isMobile]: props.isMobile })}>
      {props.icon}
      <div className={styles.featureText}>
        <div className={styles.featureTitle}>{props.title}</div>
        <div className={styles.featureDescription}>{props.description}</div>
      </div>
    </div>
  )
}

const PlatformFeatures = (props: PlatformFeaturesProps) => {
  // Animate in the title and subtitle text
  const [hasViewed, refInView] = useHasViewed(0.8)

  const textStyles = useSpring({
    config: { mass: 3, tension: 2000, friction: 500 },
    opacity: hasViewed ? 1 : 0,
    x: hasViewed ? 0 : 150
  })

  return (
    <div
      className={cn(styles.container, {
        [styles.isMobile]: props.isMobile
      })}
    >
      <div className={styles.content} ref={refInView}>
        {!props.isMobile ? (
          <div className={styles.animateTitleContainer}>
            <animatedAny.div
              style={{
                opacity: textStyles.opacity,
                transform: textStyles.x.interpolate(
                  (x) => `translate3d(0,${x}px,0)`
                )
              }}
            >
              <div className={styles.header}>
                <h3 className={styles.title}>{messages.title}</h3>
                <h4 className={styles.subTitle}>{messages.subTitle}</h4>
              </div>
            </animatedAny.div>
          </div>
        ) : null}
        <div className={styles.body}>
          <img
            src={productShot}
            className={styles.productShot}
            alt='Audius Web and Mobile Product Shot'
          />
          {props.isMobile ? (
            <div className={styles.animateTitleContainer}>
              <animatedAny.div
                style={{
                  opacity: textStyles.opacity,
                  transform: textStyles.x.interpolate(
                    (x) => `translate3d(0,${x}px,0)`
                  )
                }}
              >
                <div className={styles.header}>
                  <h3 className={styles.title}>{messages.title}</h3>
                  <h4 className={styles.subTitle}>{messages.subTitle}</h4>
                </div>
              </animatedAny.div>
            </div>
          ) : null}
          <div className={styles.features}>
            {features.map((feature) => (
              <Feature key={feature.title} {...props} {...feature} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlatformFeatures
