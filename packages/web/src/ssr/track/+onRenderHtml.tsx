import type { Track, User } from '@audius/common/models'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import createEmotionServer from '@emotion/server/create-instance'
import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { ServerWebPlayer } from 'app/web-player/ServerWebPlayer'
import { MetaTags } from 'components/meta-tags/MetaTags'
import { DesktopServerTrackPage } from 'pages/track-page/DesktopServerTrackPage'
import { MobileServerTrackPage } from 'pages/track-page/MobileServerTrackPage'
import { isMobileUserAgent } from 'utils/clientUtil'
import { getTrackPageSEOFields } from 'utils/seo'

import { getIndexHtml } from '../getIndexHtml'

type TrackPageContext = PageContextServer & {
  pageProps: {
    track: Track & { id: string }
    user: User
  }
}

export default function render(pageContext: TrackPageContext) {
  const { pageProps, headers, urlPathname } = pageContext
  const { track, user } = pageProps
  const { id, title, permalink, release_date, created_at } = track
  const { name: userName } = user

  const userAgent = headers?.['user-agent'] ?? ''
  const isMobile = isMobileUserAgent(userAgent)

  // Create a fresh cache instance for this SSR request
  // This ensures the theme context is properly connected
  const cache = createCache({ key: 'harmony', prepend: true })
  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(cache)

  const seoMetadata = getTrackPageSEOFields({
    title,
    permalink,
    userName,
    releaseDate: release_date || created_at,
    hashId: id
  })

  const pageHtml = renderToString(
    <CacheProvider value={cache}>
      <ServerWebPlayer isMobile={isMobile} location={urlPathname}>
        <>
          <MetaTags {...seoMetadata} />
          {isMobile ? (
            <MobileServerTrackPage track={track} user={user} />
          ) : (
            <DesktopServerTrackPage track={track} user={user} />
          )}
        </>
      </ServerWebPlayer>
    </CacheProvider>
  )

  const helmet = Helmet.renderStatic()
  const chunks = extractCriticalToChunks(pageHtml)
  const styles = constructStyleTagsFromChunks(chunks)

  const html = getIndexHtml()
    .replace(`<div id="root"></div>`, `<div id="root">${pageHtml}</div>`)
    .replace(
      `<meta property="helmet" />`,
      `
      ${helmet.title.toString()}
      ${helmet.meta.toString()}
      ${helmet.link.toString()}
      `
    )
    .replace(
      `<style id="emotion"></style>`,
      `
      ${styles}
      `
    )

  return escapeInject`${dangerouslySkipEscape(html)}`
}
