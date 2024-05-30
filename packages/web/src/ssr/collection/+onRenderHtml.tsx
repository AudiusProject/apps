import type { Collection, Track, User } from '@audius/common/models'
import createEmotionServer from '@emotion/server/create-instance'
import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { ServerWebPlayer } from 'app/web-player/ServerWebPlayer'
import { MetaTags } from 'components/meta-tags/MetaTags'
import { ServerCollectionPage } from 'pages/collection-page/ServerCollectionPage'
import { isMobileUserAgent } from 'utils/clientUtil'
import { getCollectionPageSEOFields } from 'utils/seo'

import { harmonyCache } from '../../HarmonyCacheProvider'
import { getIndexHtml } from '../getIndexHtml'

const { extractCriticalToChunks, constructStyleTagsFromChunks } =
  createEmotionServer(harmonyCache)

type TrackPageContext = PageContextServer & {
  pageProps: {
    collection: Collection
    user: User
    tracks: Track[]
  }
  userAgent: string
}

export default function render(pageContext: TrackPageContext) {
  const { pageProps, userAgent } = pageContext
  const { collection, user, tracks } = pageProps
  const { playlist_id, playlist_name, permalink, is_album } = collection
  const { user_id, name: userName, handle: userHandle } = user

  const isMobile = isMobileUserAgent(userAgent)

  const seoMetadata = getCollectionPageSEOFields({
    playlistName: playlist_name,
    playlistId: playlist_id,
    userName,
    userHandle,
    isAlbum: is_album,
    permalink
  })

  const pageHtml = renderToString(
    <ServerWebPlayer
      isMobile={isMobile}
      initialState={{
        collections: { entries: { [playlist_id]: { metadata: collection } } },
        users: { entries: { [user_id]: { metadata: user } } },
        tracks: {
          entries: tracks.reduce((acc, track) => {
            const { track_id } = track
            return { ...acc, [track_id]: { metadata: track } }
          }, {})
        }
      }}
    >
      <>
        <MetaTags {...seoMetadata} />
        <ServerCollectionPage collectionId={playlist_id} isMobile={isMobile} />
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
