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

export const handleClickRoute =
  (
    route: string,
    setRenderPublicSite: (shouldRender: boolean) => void,
    navigate: NavigateFunction
  ) =>
  (e?: MouseEvent) => {
    e?.preventDefault()
    if (route.startsWith('http') || LANDING_PAGE_ROUTES.has(route)) {
      pushWindowRoute(route)
    } else {
      setRenderPublicSite(false)
      navigate(route)
    }
  }
