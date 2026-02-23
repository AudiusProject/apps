import { useEffect, useState } from 'react'

import { ThemeProvider } from '@audius/harmony'

import { CookieBanner } from 'components/cookie-banner/CookieBanner'
import { dismissCookieBanner as dismissCookieBannerAction } from 'store/application/ui/cookieBanner/actions'
import { shouldShowCookieBanner, dismissCookieBanner } from 'utils/gdpr'

import styles from './LandingPage2026.module.css'
import { CreateFutureCTA } from './components/CreateFutureCTA'
import { FAQ2026 } from './components/FAQ2026'
import { FeaturedContests2026 } from './components/FeaturedContests2026'
import { Footer2026 } from './components/Footer2026'
import { GrowthStartsHere } from './components/GrowthStartsHere'
import { Hero2026 } from './components/Hero2026'
import { MadeForUs } from './components/MadeForUs'
import { Nav2026 } from './components/Nav2026'
import { Partners2026 } from './components/Partners2026'
import { WhoUsesAudius2026 } from './components/WhoUsesAudius2026'

const MOBILE_MAX_WIDTH = 800
const MOBILE_MEDIA_QUERY =
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    : null

type LandingPage2026Props = {
  isMobile: boolean
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

export const LandingPage2026 = (props: LandingPage2026Props) => {
  const [isMobileOrNarrow, setIsMobileOrNarrow] = useState(props.isMobile)
  const [showCookieBanner, setShowCookieBanner] = useState(false)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    if (MOBILE_MEDIA_QUERY) {
      const handler = () => setIsMobileOrNarrow(MOBILE_MEDIA_QUERY.matches)
      handler()
      MOBILE_MEDIA_QUERY.addListener(handler)
      return () => MOBILE_MEDIA_QUERY.removeListener(handler)
    }
  }, [])

  useEffect(() => {
    shouldShowCookieBanner().then((show) => setShowCookieBanner(show))
  }, [])

  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || ''
    const fontsCssHref = `${base}/fonts-landing-2026.css`
    const urbanistHref =
      'https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap'

    const linkFonts = document.createElement('link')
    linkFonts.rel = 'stylesheet'
    linkFonts.href = fontsCssHref

    const linkUrbanist = document.createElement('link')
    linkUrbanist.rel = 'stylesheet'
    linkUrbanist.href = urbanistHref

    const maxWait = 1500
    const finish = () => {
      const ready = document.fonts?.ready
        ? Promise.race([
            document.fonts.ready,
            new Promise<void>((resolve) => setTimeout(resolve, maxWait))
          ])
        : Promise.resolve()
      ready.then(() => setFontsReady(true))
    }

    let loaded = 0
    const maybeFinish = () => {
      loaded += 1
      if (loaded >= 2) finish()
    }
    linkFonts.onload = maybeFinish
    linkFonts.onerror = maybeFinish
    linkUrbanist.onload = maybeFinish
    linkUrbanist.onerror = maybeFinish

    document.head.appendChild(linkFonts)
    document.head.appendChild(linkUrbanist)

    const fallback = setTimeout(() => setFontsReady(true), maxWait + 500)
    return () => {
      clearTimeout(fallback)
      linkFonts.remove()
      linkUrbanist.remove()
    }
  }, [])

  const onDismissCookie = () => {
    dismissCookieBanner()
    setShowCookieBanner(false)
    return dismissCookieBannerAction()
  }

  return (
    <ThemeProvider theme='day'>
      <div
        id='landing-page-2026'
        className={styles.page}
        data-fonts-ready={fontsReady ? 'true' : undefined}
      >
        {showCookieBanner ? (
          <CookieBanner isPlaying={false} dismiss={onDismissCookie} />
        ) : null}
        <Nav2026
          isMobile={isMobileOrNarrow}
          openNavScreen={props.openNavScreen}
          setRenderPublicSite={props.setRenderPublicSite}
        />
        <main className={styles.main}>
          <Hero2026
            isMobile={isMobileOrNarrow}
            setRenderPublicSite={props.setRenderPublicSite}
          />
          <div className={styles.spacer} />
          <MadeForUs isMobile={isMobileOrNarrow} />
          <div className={styles.spacer} />
          <WhoUsesAudius2026
            isMobile={isMobileOrNarrow}
            setRenderPublicSite={props.setRenderPublicSite}
          />
          <div className={styles.spacer} />
          <GrowthStartsHere isMobile={isMobileOrNarrow} />
          <div className={styles.spacer} />
          <FeaturedContests2026
            isMobile={isMobileOrNarrow}
            setRenderPublicSite={props.setRenderPublicSite}
          />
          <div className={styles.spacer} />
          <FAQ2026 isMobile={isMobileOrNarrow} />
          <div className={styles.spacer} />
          <CreateFutureCTA
            isMobile={isMobileOrNarrow}
            setRenderPublicSite={props.setRenderPublicSite}
          />
          <div className={styles.spacerSmall} />
          <Partners2026 isMobile={isMobileOrNarrow} />
          <div className={styles.spacerSmall} />
        </main>
        <Footer2026
          isMobile={isMobileOrNarrow}
          setRenderPublicSite={props.setRenderPublicSite}
        />
      </div>
    </ThemeProvider>
  )
}
