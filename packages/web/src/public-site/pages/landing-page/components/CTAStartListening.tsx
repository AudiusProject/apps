import { route } from '@audius/common/utils'
import { IconCaretRight } from '@audius/harmony'
import { useNavigate } from 'react-router-dom'
import { Parallax } from 'react-scroll-parallax'

import footerBackgroundMobile from 'assets/img/publicSite/Footer-Background-mobile@2x.jpg'
import footerBackground from 'assets/img/publicSite/Footer-Background@2x.jpg'
import footerForeground from 'assets/img/publicSite/Footer-Foreground@2x.png'
import dots2x from 'assets/img/publicSite/dots@2x.jpg'
import { handleClickRoute } from 'public-site/components/handleClickRoute'

import styles from './CTAStartListening.module.css'

const { TRENDING_PAGE } = route

const messages = {
  title: 'Music Done Right',
  cta: 'Listen Now'
}

type CTAStartListeningProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

const CTAStartListening = (props: CTAStartListeningProps) => {
  const navigate = useNavigate()
  if (props.isMobile) {
    return (
      <div className={styles.mobileContainer}>
        <div
          className={styles.footerForeground}
          style={{ backgroundImage: `url(${footerForeground})` }}
        />
        <div className={styles.mobileBgContent}>
          <div className={styles.parallaxBg}></div>
          <Parallax className={styles.bgParallax} translateY={[-100, 0]}>
            <div
              className={styles.footerBackground}
              style={{
                backgroundImage: `url(${footerBackgroundMobile})`
              }}
            />
          </Parallax>
        </div>
        <div className={styles.title}>{messages.title}</div>
        <div
          onClick={handleClickRoute(
            TRENDING_PAGE,
            props.setRenderPublicSite,
            navigate
          )}
          className={styles.ctaButton}
        >
          {messages.cta}
          <IconCaretRight className={styles.iconCaretRight} />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.title}>{messages.title}</div>
        <button
          onClick={handleClickRoute(
            TRENDING_PAGE,
            props.setRenderPublicSite,
            navigate
          )}
          className={styles.ctaButton}
        >
          {messages.cta}
          <IconCaretRight className={styles.iconCaretRight} />
        </button>
        <div
          className={styles.footerForeground}
          style={{ backgroundImage: `url(${footerForeground})` }}
        />
      </div>
      <div className={styles.footerBackgroundContainer}>
        <div className={styles.bgContent}>
          <div className={styles.parallaxBg}></div>
          <Parallax className={styles.bgParallax} translateY={[-70, -30]}>
            <div
              className={styles.footerBackground}
              style={{
                backgroundImage: `url(${footerBackground})`
              }}
            />
          </Parallax>
        </div>
      </div>
      <div
        className={styles.dotsBackground}
        style={{ backgroundImage: `url(${dots2x})` }}
      ></div>
    </div>
  )
}

export default CTAStartListening
