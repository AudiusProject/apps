import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import { NavigateFunction } from 'react-router'

import { pushWindowRoute } from 'utils/route'

const {
  AUDIUS_PRESS_LINK,
  DOWNLOAD_LINK,
  DOWNLOAD_START_LINK,
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  API_TERMS
} = route

const LANDING_PAGE_ROUTES = new Set([
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
  API_TERMS,
  AUDIUS_PRESS_LINK,
  DOWNLOAD_START_LINK,
  DOWNLOAD_LINK
])

/**
 * Pushes a route (preventing default so that anchor tag hrefs are not used):
 * Anchor tags may have hrefs for SEO support.
 * - replace href if an external URL
 * - pushState if an internal URL (this is faster than replacing href)
 * Note: pushRoute cannot be used because the public site has a separate router context
 *
 * @param route the route to push (can be a FQDN or a react route)
 * @param setRenderPublicSite state setter to hide the public site
 */
export const handleClickRoute =
  (
    route: string,
    setRenderPublicSite: (shouldRender: boolean) => void,
    navigate: NavigateFunction
  ) =>
  (e?: MouseEvent) => {
    e?.preventDefault()
    // Http(s) routes and landing page routes should trigger a full window reload
    // They are external domains, or in the case of landing pages, we want
    // to load in from 0-state (otherwise it will get picked up by the app router)
    if (route.startsWith('http') || LANDING_PAGE_ROUTES.has(route)) {
      pushWindowRoute(route)
    } else {
      setRenderPublicSite(false)
      navigate(route)
    }
  }
