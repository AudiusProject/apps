import { lazy, Suspense, useState, useCallback, useEffect } from 'react'

import { route } from '@audius/common/utils'
import { ThemeProvider } from '@audius/harmony'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router'

import LoadingSpinnerFullPage from 'components/loading-spinner-full-page/LoadingSpinnerFullPage'
import NavScreen from 'public-site/components/NavOverlay'
import { env } from 'services/env'

import { AppContextProvider } from '../app/AppContextProvider'

import LandingPage from './pages/landing-page/LandingPage'

const {
  TRENDING_PAGE,
  SIGN_UP_PAGE,
  UPLOAD_PAGE,
  EXPLORE_PAGE,
  AUDIUS_PRESS_LINK
} = route

const PrivacyPolicyPage = lazy(
  () => import('./pages/privacy-policy-page/PrivacyPolicyPage')
)
const ApiTermsPage = lazy(() => import('./pages/api-terms-page/ApiTermsPage'))
const DownloadPage = lazy(() => import('./pages/download-page/DownloadPage'))
const TermsOfUsePage = lazy(
  () => import('./pages/terms-of-use-page/TermsOfUsePage')
)
const ArtistCoinTermsPage = lazy(
  () => import('./pages/artist-coin-terms-page/ArtistCoinTermsPage')
)
const ArtistCoinAcceptableUsePage = lazy(
  () =>
    import(
      './pages/artist-coin-acceptable-use-page/ArtistCoinAcceptableUsePage'
    )
)

const ROOT_ID = 'root'
const SCROLL_LOCK_CLASS = 'scrollLock'
const MOBILE_MAX_WIDTH = 800
const MOBILE_WIDTH_MEDIA_QUERY = window.matchMedia(
  `(max-width: ${MOBILE_MAX_WIDTH}px)`
)

// Component to handle external URL redirects
const ExternalRedirect = ({ to }: { to: string }) => {
  useEffect(() => {
    window.location.href = to
  }, [to])
  return null
}

type PublicSiteProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

export const PublicSite = (props: PublicSiteProps) => {
  const { isMobile, setRenderPublicSite } = props
  const [isMobileOrNarrow, setIsMobileOrNarrow] = useState(isMobile)
  const handleMobileMediaQuery = useCallback(() => {
    if (MOBILE_WIDTH_MEDIA_QUERY.matches) setIsMobileOrNarrow(true)
    else setIsMobileOrNarrow(isMobile)
  }, [isMobile])

  useEffect(() => {
    handleMobileMediaQuery()
    MOBILE_WIDTH_MEDIA_QUERY.addListener(handleMobileMediaQuery)
    return () => MOBILE_WIDTH_MEDIA_QUERY.removeListener(handleMobileMediaQuery)
  }, [handleMobileMediaQuery])

  const [isNavScreenOpen, setIsNavScreenOpen] = useState(false)

  const closeNavScreen = useCallback(() => {
    const el = document.getElementById(ROOT_ID)
    if (!el) return
    el.classList.remove(SCROLL_LOCK_CLASS)
    const scrollTop = parseInt(el.style.top || '', 10) || 0
    el.style.removeProperty('top')
    window.scrollTo({ top: -1 * scrollTop })
    setIsNavScreenOpen(false)
  }, [setIsNavScreenOpen])

  const openNavScreen = useCallback(() => {
    const el = document.getElementById(ROOT_ID)
    if (!el) return
    el.style.top = `-${window.pageYOffset}px`
    el.classList.add(SCROLL_LOCK_CLASS)
    setIsNavScreenOpen(true)
  }, [setIsNavScreenOpen])

  return (
    <>
      <div style={{ display: 'none' }}>
        <h1>Audius</h1>
        <h2>
          <a href={TRENDING_PAGE}>Trending</a>
        </h2>
        <h2>
          <a href={EXPLORE_PAGE}>Explore</a>
        </h2>
        <h2>
          <a href={SIGN_UP_PAGE}>Sign Up</a>
        </h2>
        <h2>
          <a href={UPLOAD_PAGE}>Upload</a>
        </h2>
      </div>

      <Suspense fallback={<div style={{ width: '100vw', height: '100vh' }} />}>
        <ThemeProvider theme='day'>
          <AppContextProvider>
            {(() => {
              const RouterComponent = env.USE_HASH_ROUTING
                ? HashRouter
                : BrowserRouter
              const basename = env.BASENAME || undefined
              // In React Router v7, future flags are enabled by default for declarative routers
              // The future prop is only available for data routers (createBrowserRouter)
              return (
                <RouterComponent basename={basename}>
                  <NavScreen
                    closeNavScreen={closeNavScreen}
                    isOpen={isNavScreenOpen}
                    setRenderPublicSite={setRenderPublicSite}
                  />
                  <Routes>
                    <Route
                      path='/legal/terms-of-use'
                      element={
                        <TermsOfUsePage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/legal/privacy-policy'
                      element={
                        <PrivacyPolicyPage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/legal/artist-coin-terms'
                      element={
                        <ArtistCoinTermsPage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/legal/artist-coin-acceptable-use'
                      element={
                        <ArtistCoinAcceptableUsePage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/legal/api-terms'
                      element={
                        <ApiTermsPage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/press'
                      element={<ExternalRedirect to={AUDIUS_PRESS_LINK} />}
                    />
                    <Route
                      path='/download'
                      element={
                        <DownloadPage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/'
                      element={
                        <LandingPage
                          isMobile={isMobileOrNarrow}
                          openNavScreen={openNavScreen}
                          setRenderPublicSite={setRenderPublicSite}
                        />
                      }
                    />
                    <Route
                      path='/auth-redirect'
                      element={<LoadingSpinnerFullPage />}
                    />
                  </Routes>
                </RouterComponent>
              )
            })()}
          </AppContextProvider>
        </ThemeProvider>
      </Suspense>
    </>
  )
}
