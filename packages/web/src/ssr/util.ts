import { resolveRoute } from 'vike/routing'
import type { PageContextServer } from 'vike/types'

const CHANGE_EMAIL_SETTINGS_PAGE = '/settings/change-email'
const CHANGE_PASSWORD_SETTINGS_PAGE = '/settings/change-password'
const CHAT_PAGE = '/messages/:id?'

const assetPaths = new Set(['src', 'assets', 'scripts', 'fonts', 'favicons'])

const invalidPaths = new Set(['undefined'])

const reservedPaths = new Set([
  'upload',
  'explore',
  'audio',
  'signup',
  'download',
  'trending',
  'feed',
  'library',
  'history',
  'dashboard',
  'rewards',
  'settings',
  'notifications',
  'messages',
  'search',
  'coins',
  'clubs',
  'cash',
  'wallet',
  'legal',
  'error'
])

const staticRoutes = new Set(['/'])

const nonSsrPaths = [
  CHANGE_EMAIL_SETTINGS_PAGE,
  CHANGE_PASSWORD_SETTINGS_PAGE,
  CHAT_PAGE, // Individual chat pages, not the main messages page
  '/react-query',
  '/react-query-cache-prime',
  '/react-query-redux-cache-sync',
  '/react-query-to-redux-cache-sync'
]

export const makePageRoute =
  (routes: string[], pageName?: string) =>
  ({ urlPathname }: PageContextServer) => {
    const firstSegment = urlPathname.split('/')[1]

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]

      if (
        assetPaths.has(firstSegment) ||
        invalidPaths.has(firstSegment) ||
        staticRoutes.has(urlPathname)
      ) {
        continue
      }

      if (route.startsWith('/@') && reservedPaths.has(firstSegment)) {
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
    /forcessr|ahrefs(bot|siteaudit)|altavista|anthropic-ai|applebot|baiduspider|bingbot|bytespider|ccbot|chatgpt-user|claude-web|claudebot|claude-searchbot|claude-user|cohere-ai|dataforseobot|diffbot|duckduckbot|facebookbot|facebookexternalhit|gigabot|google-extended|google-inspectiontool|googlebot|googleother|gptbot|ia_archiver|iaskspider|linkedinbot|meta-externalfetcher|msnbot|nextgensearchbot|oai-searchbot|omgili|petalbot|perplexitybot|perplexity-user|pinterestbot|redditbot|semrushbot|slackbot|telegrambot|twitterbot|webpilot|whatsapp|yahoo|yandex|yeti|youbot|zoominfobot/i
  return crawlerTest.test(userAgent)
}
