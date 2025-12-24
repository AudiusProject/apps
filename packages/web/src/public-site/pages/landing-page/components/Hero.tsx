import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { IconCaretRight, IconCloudDownload } from '@audius/harmony'
import cn from 'classnames'
import { useNavigate } from 'react-router'
import { Parallax, useParallaxController } from 'react-scroll-parallax'

import HeroBackgroundMobile from 'assets/img/publicSite/HeroBG.webp'
import HeroBackground from 'assets/img/publicSite/HeroBG@2x.webp'
import HeroBackgroundXL from 'assets/img/publicSite/HeroBG@3x.webp'
import HeroForeground from 'assets/img/publicSite/ProductShot1.webp'
import AppStoreBadge from 'assets/img/publicSite/app-store-badge.svg'
import GlyphPattern1x from 'assets/img/publicSite/glyph-pattern@1x.png'
import GlyphPattern2x from 'assets/img/publicSite/glyph-pattern@2x.png'
import GooglePlayBadge from 'assets/img/publicSite/google-play-badge.svg'
import { handleClickRoute } from 'public-site/components/handleClickRoute'
import { getIOSAppLink } from 'utils/appLinks'

import styles from './Hero.module.css'

const { APP_REDIRECT, TRENDING_PAGE, DOWNLOAD_START_LINK } = route

const messages = {
  title: 'Music Done Right',
  subtitle: 'Create the future of music, together.',
  cta: 'Listen Now',
  download: 'Download The App'
}

type HeroProps = {
  isMobile: boolean
  onImageLoad: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

const iOSDownloadLink = getIOSAppLink()

const Hero = (props: HeroProps) => {
  const parallaxController = useParallaxController()
  const navigate = useNavigate()
  const { onImageLoad, isMobile } = props
  const onImgSet = useCallback(() => {
    if (!isMobile) parallaxController?.update()
    onImageLoad()
  }, [parallaxController, onImageLoad, isMobile])

  if (props.isMobile) {
    return (
      <div className={cn(styles.heroContainer, styles.mobileContainer)}>
        <div className={styles.content}>
          <div className={styles.parallaxBg}> </div>
          <Parallax className={cn(styles.mobileBG)} translateY={[0, -30]}>
            <img
              src={HeroBackgroundMobile}
              sizes={'10vw'}
              className={styles.mobileImgBG}
              onLoad={onImgSet}
              alt='Background Purple Decoration'
            />
          </Parallax>
          <h1 className={styles.title}>{messages.title}</h1>
          <div className={styles.subtitle}>
            <div>{messages.subtitle}</div>
          </div>
          <button
            onClick={handleClickRoute(
              TRENDING_PAGE,
              props.setRenderPublicSite,
              navigate
            )}
            className={styles.ctaButton}
          >
            <span className={styles.ctaMessage}>{messages.cta}</span>
            <IconCaretRight />
          </button>
          <button
            onClick={handleClickRoute(
              APP_REDIRECT,
              props.setRenderPublicSite,
              navigate
            )}
            className={styles.downloadButton}
          >
            <IconCloudDownload />
            <span className={styles.secondaryCtaMessage}>
              {messages.download}
            </span>
          </button>
          <div className={styles.appLinksContent}>
            <a href={iOSDownloadLink} target='_blank' rel='noopener noreferrer'>
              <AppStoreBadge
                aria-label='Download on the App Store'
                width={120}
                height={40}
              />
            </a>
            <a
              href='https://play.google.com/store/apps/details?id=co.audius.app'
              target='_blank'
              rel='noopener noreferrer'
              className={styles.googlePlayBtn}
            >
              <GooglePlayBadge
                aria-label='Get it on Google Play'
                width={135}
                height={40}
              />
            </a>
          </div>
        </div>
        <img
          src={GlyphPattern1x}
          srcSet={`${GlyphPattern1x} 1x, ${GlyphPattern2x} 2x`}
          alt='Pattern'
          className={styles.glyphPattern}
        />
      </div>
    )
  }

  return (
    <div className={cn(styles.container, styles.heroContainer)}>
      <div className={styles.bg}>
        <div className={styles.parallaxBg}> </div>
        <Parallax
          className={cn(styles.background, styles.fgContainer)}
          translateY={[51, -10]}
          translateX={[44, 44]}
        >
          <img
            src={HeroForeground}
            className={styles.foregroundImg}
            onLoad={onImgSet}
            alt='Foreground Audius Web and Mobile Product Shot'
          />
        </Parallax>
        <Parallax
          className={styles.background}
          translateY={[-10, -20]}
          translateX={[-25, -25]}
        >
          <img
            srcSet={`${HeroBackground} 3840w, ${HeroBackgroundXL} 5500w`}
            sizes={'(max-width: 3815px) 3840w, 5500w'}
            src={HeroBackground}
            onLoad={onImgSet}
            className={styles.foreground}
            alt='Background Purple Decoration'
          />
        </Parallax>
        <Parallax
          className={styles.textContent}
          translateY={['-40px', '110px']}
        >
          <div className={styles.content}>
            <h1 className={styles.title}>{messages.title}</h1>
            <h2 className={styles.subtitle}>{messages.subtitle}</h2>
          </div>
        </Parallax>
        <Parallax
          className={styles.buttonContentParallax}
          translateY={['-40px', '110px']}
        >
          <div className={styles.buttonContent}>
            <button
              onClick={handleClickRoute(
                TRENDING_PAGE,
                props.setRenderPublicSite,
                navigate
              )}
              className={styles.ctaButton}
            >
              <span className={styles.ctaMessage}>{messages.cta}</span>
              <IconCaretRight width={20} height={20} />
            </button>
            <button
              onClick={handleClickRoute(
                DOWNLOAD_START_LINK,
                props.setRenderPublicSite,
                navigate
              )}
              className={styles.downloadButton}
            >
              <IconCloudDownload />
              <span className={styles.secondaryCtaMessage}>
                {messages.download}
              </span>
            </button>
          </div>
        </Parallax>
        <Parallax
          className={styles.appLinksContentParallax}
          translateY={['-40px', '110px']}
        >
          <div className={styles.appLinksContent}>
            <a
              href='https://apps.apple.com/us/app/audius-music/id1491270519'
              target='_blank'
              rel='noopener noreferrer'
            >
              <AppStoreBadge
                aria-label='Download on the App Store'
                width={120}
                height={40}
              />
            </a>
            <a
              href='https://play.google.com/store/apps/details?id=co.audius.app'
              target='_blank'
              rel='noopener noreferrer'
              className={styles.googlePlayBtn}
            >
              <GooglePlayBadge
                aria-label='Get it on Google Play'
                width={135}
                height={40}
              />
            </a>
          </div>
        </Parallax>
      </div>

      <img
        src={GlyphPattern1x}
        srcSet={`${GlyphPattern1x} 1x, ${GlyphPattern2x} 2x`}
        alt='Pattern'
        className={styles.glyphPattern}
      />
    </div>
  )
}

export default Hero
