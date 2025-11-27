import { resolveRoute } from 'vike/routing'
import type { PageContextServer } from 'vike/types'

// Route constants - defined locally to avoid importing route.ts which pulls in dayjs
const SEARCH_BASE_ROUTE = '/search'
const SEARCH_PAGE = '/search/:category?'
const CHANGE_EMAIL_SETTINGS_PAGE = '/settings/change-email'
const CHANGE_PASSWORD_SETTINGS_PAGE = '/settings/change-password'
const CHATS_PAGE = '/messages'
const CHAT_PAGE = '/messages/:id?'
const DOWNLOAD_LINK = '/download'

const assetPaths = new Set(['src', 'assets', 'scripts', 'fonts', 'favicons'])

const invalidPaths = new Set(['undefined'])

const staticRoutes = new Set([
  '/',
  '/trending',
  '/feed',
  '/explore',
  '/explore/playlists',
  '/explore/underground',
  '/library',
  '/history',
  '/dashboard',
  '/audio',
  '/rewards',
  '/upload',
  '/settings',
  '/notifications',
  '/messages',
  SEARCH_BASE_ROUTE,
  '/search/all',
  '/search/profiles',
  '/search/tracks',
  '/search/albums',
  '/search/playlists'
])

const nonSsrPaths = [
  SEARCH_BASE_ROUTE,
  SEARCH_PAGE,
  CHANGE_EMAIL_SETTINGS_PAGE,
  CHANGE_PASSWORD_SETTINGS_PAGE,
  CHATS_PAGE,
  CHAT_PAGE,
  DOWNLOAD_LINK,
  '/react-query',
  '/react-query-cache-prime',
  '/react-query-redux-cache-sync',
  '/react-query-to-redux-cache-sync'
]

export const makePageRoute =
  (routes: string[], pageName?: string) =>
  ({ urlPathname }: PageContextServer) => {
    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]

      // Don't render page if the route matches any of the asset, invalid, or static  routes
      if (
        assetPaths.has(urlPathname.split('/')[1]) ||
        invalidPaths.has(urlPathname.split('/')[1]) ||
        staticRoutes.has(urlPathname)
      ) {
        continue
      }

      if (
        urlPathname.split('/')[route.split('/').length - 1] === 'index.css.map'
      ) {
        continue
      }

      const result = resolveRoute(route, urlPathname)
      const nonSsrPathResult = nonSsrPaths.some(
        (path) => resolveRoute(path, urlPathname).match
      )

      if (result.match && !nonSsrPathResult) {
        console.info(`Rendering ${pageName ?? route}`, urlPathname)
        return result
      }
    }
    return false
  }

export const checkIsCrawler = (userAgent: string) => {
  if (!userAgent) {
    return false
  }
  const crawlerTest =
    /forcessr|ahrefs(bot|siteaudit)|altavista|baiduspider|bingbot|duckduckbot|googlebot|google-inspectiontool|msnbot|nextgensearchbot|yahoo|yandex/i
  return crawlerTest.test(userAgent)
}
