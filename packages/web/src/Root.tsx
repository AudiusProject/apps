import '@audius/harmony/dist/harmony.css'

import { Suspense, useState, useEffect, lazy } from 'react'

import { route } from '@audius/common/utils'
import { useAsync } from 'react-use'

import { useIsMobile } from 'hooks/useIsMobile'
import { localStorage } from 'services/local-storage'
import { remoteConfigInstance } from 'services/remote-config/remote-config-instance'
import { isElectron } from 'utils/clientUtil'
import { getPathname } from 'utils/route'

import App from './app'

const { HOME_PAGE, publicSiteRoutes } = route

const PublicSite = lazy(() => import('./public-site'))

const isPublicSiteRoute = (pathname: string) => {
  const normalizedPathname = getPathname({ pathname } as any).toLowerCase()
  return [...publicSiteRoutes, HOME_PAGE].includes(normalizedPathname)
}

const isPublicSiteSubRoute = (pathname: string) => {
  const normalizedPathname = getPathname({ pathname } as any).toLowerCase()
  return publicSiteRoutes.includes(normalizedPathname)
}

const clientIsElectron = isElectron()

const AppOrPublicSite = () => {
  const isMobile = useIsMobile()
  const currentPathname = window.location.pathname
  const [renderPublicSite, setRenderPublicSite] = useState(
    isPublicSiteRoute(currentPathname)
  )

  useEffect(() => {
    remoteConfigInstance.init()
  }, [])

  const { value: foundUser } = useAsync(() =>
    localStorage.getAudiusAccountUser()
  )

  useEffect(() => {
    // Listen to popstate events to update renderPublicSite
    const handlePopState = () => {
      setRenderPublicSite(isPublicSiteRoute(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const shouldRedirectToApp =
    foundUser && !isPublicSiteSubRoute(currentPathname)

  if (renderPublicSite && !clientIsElectron && !shouldRedirectToApp) {
    return (
      <Suspense fallback={<div style={{ width: '100vw', height: '100vh' }} />}>
        <PublicSite
          isMobile={isMobile}
          setRenderPublicSite={setRenderPublicSite}
        />
      </Suspense>
    )
  }

  return <App />
}

export const Root = () => {
  return <AppOrPublicSite />
}
