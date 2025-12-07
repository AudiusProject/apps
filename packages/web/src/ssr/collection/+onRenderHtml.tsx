import type { Collection, User } from '@audius/common/models'
import createEmotionServer from '@emotion/server/create-instance'
import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { ServerWebPlayer } from 'app/web-player/ServerWebPlayer'
import { MetaTags } from 'components/meta-tags/MetaTags'
import { DesktopServerCollectionPage } from 'pages/collection-page/DesktopServerCollectionPage'
import { MobileServerCollectionPage } from 'pages/collection-page/MobileServerCollectionPage'
import { isMobileUserAgent } from 'utils/clientUtil'
import { getCollectionPageSEOFields } from 'utils/seo'

import { harmonyCache } from '../../HarmonyCacheProvider'
import { getIndexHtml } from '../getIndexHtml'

const { extractCriticalToChunks, constructStyleTagsFromChunks } =
  createEmotionServer(harmonyCache as any)

type CollectionPageContext = PageContextServer & {
  pageProps: {
    collection: Collection & { id: string }
    user: User
  }
}

export default function render(pageContext: CollectionPageContext) {
  const { pageProps, headers, urlPathname } = pageContext
  const { collection, user } = pageProps
  const { id, playlist_id, playlist_name, permalink, is_album } = collection
  const { name: userName, handle: userHandle } = user

  const userAgent = headers?.['user-agent'] ?? ''
  const isMobile = isMobileUserAgent(userAgent)

  const seoMetadata = getCollectionPageSEOFields({
    playlistName: playlist_name,
    playlistId: playlist_id,
    userName,
    userHandle,
    isAlbum: is_album,
    permalink,
    hashId: id
  })

  const pageHtml = renderToString(
    <ServerWebPlayer isMobile={isMobile} location={urlPathname}>
      <>
        <MetaTags {...seoMetadata} />
        {isMobile ? (
          <MobileServerCollectionPage collection={collection} user={user} />
        ) : (
          <DesktopServerCollectionPage collection={collection} user={user} />
        )}
      </>
    </ServerWebPlayer>
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
