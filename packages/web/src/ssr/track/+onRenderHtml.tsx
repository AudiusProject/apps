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
import {
  canEmbed,
  DEFAULT_IMAGE_URL,
  getAppUrl,
  getEmbedUrl,
  getTrackPageContext,
  getWebUrl,
  isDiscord
} from 'ssr/metaTags'
import { isMobileUserAgent } from 'utils/clientUtil'
import { fullTrackPage } from 'utils/route'

import { getIndexHtml } from '../getIndexHtml'

type CommentData = {
  comment: { entity_id: string; user_id: string }
  track: { id: string; title: string; user: { name: string } }
  commenter: { name: string }
}

type TrackPageContext = PageContextServer & {
  pageProps: {
    track: Track & { id: string; is_stream_gated?: boolean }
    user: User
    commentData?: CommentData | null
    originalTrackPermalink?: string | null
  }
}

export default function render(pageContext: TrackPageContext) {
  const { pageProps, headers, urlPathname } = pageContext
  const { track, user, commentData } = pageProps
  const { id, title, permalink, release_date, created_at, is_stream_gated } =
    track
  const { name: userName } = user

  const userAgent = headers?.['user-agent'] ?? ''
  const isMobile = isMobileUserAgent(userAgent)

  // Check if this request can show an embed player (Twitter/Discord bots)
  // Don't show embed for comment pages
  const shouldEmbed = canEmbed(userAgent) && !is_stream_gated && !commentData

  // Create a fresh cache instance for this SSR request
  // This ensures the theme context is properly connected
  const cache = createCache({ key: 'harmony', prepend: true })
  const { extractCriticalToChunks, constructStyleTagsFromChunks } =
    createEmotionServer(cache)

  // Build meta tags - use comment-specific if we have comment data
  let seoMetadata
  if (commentData) {
    const trackName = commentData.track.title
    const artistName = commentData.track.user.name
    const commenterName = commentData.commenter.name
    seoMetadata = {
      title: `${commenterName}'s comment on ${trackName} | Audius Music`,
      description: `Join the conversation around ${trackName} by ${artistName} — streaming on Audius`,
      image: DEFAULT_IMAGE_URL
    }
  } else {
    const isRemix = !!(
      (track as { remix_of?: unknown; remixOf?: unknown }).remix_of ??
      (track as { remix_of?: unknown; remixOf?: unknown }).remixOf
    )
    const originalTrackCanonicalUrl =
      pageProps.originalTrackPermalink != null
        ? fullTrackPage(pageProps.originalTrackPermalink)
        : undefined
    seoMetadata = getTrackPageContext({
      title,
      permalink,
      userName,
      releaseDate: release_date ?? created_at,
      hashId: id,
      isRemix,
      originalTrackCanonicalUrl
    })
  }

  // Generate embed and app URLs
  const embedUrl = getEmbedUrl('track', id)
  const appUrl = getAppUrl(urlPathname)
  const webUrl = getWebUrl(urlPathname)

  // Discord uses a weird aspect ratio for OG unfurls, so serve artwork
  // directly instead of the custom OG image
  const discordBot = isDiscord(userAgent)
  const discordImageOverride = discordBot
    ? track?.artwork?.['1000x1000'] ?? DEFAULT_IMAGE_URL
    : undefined

  const pageHtml = renderToString(
    <CacheProvider value={cache}>
      <ServerWebPlayer isMobile={isMobile} location={urlPathname}>
        <>
          <MetaTags
            {...seoMetadata}
            {...(discordImageOverride
              ? { image: discordImageOverride, entityType: undefined, hashId: undefined }
              : {})}
            embed={shouldEmbed}
            embedUrl={embedUrl}
            appUrl={appUrl}
            webUrl={webUrl}
            thumbnail={false}
          />
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
