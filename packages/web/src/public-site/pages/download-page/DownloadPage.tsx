import { useCallback, useEffect, useState } from 'react'

import { OS, MobileOS } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { IconCloudDownload, ThemeProvider } from '@audius/harmony'
import queryString from 'query-string'
import { useLocation } from 'react-router'

import { CookieBanner } from 'components/cookie-banner/CookieBanner'
import { Footer2026 } from 'public-site/pages/landing-2026/components/Footer2026'
import { Nav2026 } from 'public-site/pages/landing-2026/components/Nav2026'
import { Partners2026 } from 'public-site/pages/landing-2026/components/Partners2026'
import DownloadApp from 'services/download-app/DownloadApp'
import { getIOSAppLink } from 'utils/appLinks'
import { getOS } from 'utils/clientUtil'
import { dismissCookieBanner, shouldShowCookieBanner } from 'utils/gdpr'

import styles from './DownloadPage.module.css'
import DownloadStartingMessage from './components/DownloadStartingMessage'

const { ANDROID_PLAY_STORE_LINK } = route

const MOBILE_MAX_WIDTH = 800
const MOBILE_MEDIA_QUERY =
  typeof window !== 'undefined'
    ? window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`)
    : null

const messages = {
  titleLine1: 'Download',
  titleLine2: 'the App',
  subtitle: 'For the best experience download our app.',
  desktop: 'Desktop',
  mobile: 'Mobile',
  forMac: 'For Mac',
  forWindows: 'For Windows',
  forLinux: 'For Linux',
  iOS: 'iOS',
  android: 'Android'
}

type DownloadPageProps = {
  isMobile: boolean
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

const os = getOS()
const iOSDownloadLink = getIOSAppLink()

const DesktopDownloadButton = ({ os, label }: { os: OS; label: string }) => {
  return (
    <button
      onClick={() => DownloadApp.start(os)}
      className={styles.downloadLink}
    >
      <IconCloudDownload className={styles.linkIcon} />
      {label}
    </button>
  )
}

const MobileDownloadLink = ({ os, label }: { os: MobileOS; label: string }) => {
  const downloadLink =
    os === MobileOS.IOS ? iOSDownloadLink : ANDROID_PLAY_STORE_LINK

  return (
    <a href={downloadLink} className={styles.downloadLink}>
      <IconCloudDownload className={styles.linkIcon} />
      {label}
    </a>
  )
}

const DownloadPage = (props: DownloadPageProps) => {
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
    document.documentElement.style.height = 'auto'
    return () => {
      document.documentElement.style.height = ''
    }
  })

  const { search } = useLocation()
  const { start_download } = queryString.parse(search)

  const downloadDesktopApp = useCallback(() => {
    if (!os) return
    DownloadApp.start(os)
  }, [])

  useEffect(() => {
    if (start_download) {
      downloadDesktopApp()
    }
  }, [downloadDesktopApp, start_download])

  useEffect(() => {
    shouldShowCookieBanner().then((show) => {
      setShowCookieBanner(show)
    })
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

  const onDismissCookiePolicy = useCallback(() => {
    dismissCookieBanner()
    setShowCookieBanner(false)
  }, [])

  return (
    <ThemeProvider theme='day'>
      <div
        id='download-page'
        className={styles.page}
        data-fonts-ready={fontsReady ? 'true' : undefined}
      >
        {showCookieBanner ? (
          <CookieBanner
            isMobile={isMobileOrNarrow}
            isPlaying={false}
            // @ts-ignore
            dismiss={onDismissCookiePolicy}
          />
        ) : null}
        <Nav2026
          isMobile={isMobileOrNarrow}
          openNavScreen={props.openNavScreen}
          setRenderPublicSite={props.setRenderPublicSite}
        />
        <main className={styles.main}>
          {start_download && os ? <DownloadStartingMessage /> : null}
          <div className={styles.spacer} />
          <div className={styles.titleSection}>
            <h1 className={styles.title}>
              <span className={styles.titleLine1}>{messages.titleLine1}</span>{' '}
              <span className={styles.titleLine2}>{messages.titleLine2}</span>
            </h1>
            <p className={styles.subtitle}>{messages.subtitle}</p>
          </div>
          <div className={styles.spacer} />
          <div className={styles.downloadGrid}>
            <div className={styles.desktopColumn}>
              <h2 className={styles.sectionHeading}>{messages.desktop}</h2>
              <div className={styles.links}>
                <DesktopDownloadButton os={OS.MAC} label={messages.forMac} />
                <DesktopDownloadButton
                  os={OS.WIN}
                  label={messages.forWindows}
                />
                <DesktopDownloadButton
                  os={OS.LINUX}
                  label={messages.forLinux}
                />
              </div>
            </div>
            <div className={styles.mobileColumn}>
              <h2 className={styles.sectionHeading}>{messages.mobile}</h2>
              <div className={styles.links}>
                <MobileDownloadLink os={MobileOS.IOS} label={messages.iOS} />
                <MobileDownloadLink
                  os={MobileOS.ANDROID}
                  label={messages.android}
                />
              </div>
            </div>
          </div>
          <div className={styles.spacer} />
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

export default DownloadPage
