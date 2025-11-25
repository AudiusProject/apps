import type { User } from '@audius/common/models'
import createEmotionServer from '@emotion/server/create-instance'
import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { ServerWebPlayer } from 'app/web-player/ServerWebPlayer'
import { MetaTags } from 'components/meta-tags/MetaTags'
import { DesktopServerProfilePage } from 'pages/profile-page/DesktopServerProfilePage'
import { MobileServerProfilePage } from 'pages/profile-page/MobileServerProfilePage'
import { isMobileUserAgent } from 'utils/clientUtil'
import { getUserPageSEOFields } from 'utils/seo'

import { harmonyCache } from '../../HarmonyCacheProvider'
import { getIndexHtml } from '../getIndexHtml'

const { extractCriticalToChunks, constructStyleTagsFromChunks } =
  createEmotionServer(harmonyCache)

type TrackPageContext = PageContextServer & {
  pageProps: {
    user: User
  }
  userAgent: string
}

export default function render(pageContext: TrackPageContext) {
  const { pageProps, userAgent, urlPathname } = pageContext
  const { user } = pageProps
  const { user_id, name, bio } = user
  // Use lower case since cache lookup by handle will lowercase it
  const handle = user.handle.toLowerCase()

  const isMobile = isMobileUserAgent(userAgent)

  const seoMetadata = getUserPageSEOFields({
    handle,
    userName: name,
    bio: bio ?? ''
  })

  const pageHtml = renderToString(
    <ServerWebPlayer
      isMobile={isMobile}
      location={urlPathname}
      initialState={{
        // todo: prefill this in the query client
        // users: {
        //   handles: { [handle]: user_id },
        //   entries: { [user_id]: { metadata: user } }
        // },
        pages: {
          profile: {
            currentUser: handle,
            entries: { [user_id]: { userId: user_id, handle } }
          }
        }
      }}
    >
      <>
        <MetaTags {...seoMetadata} />
        {isMobile ? <MobileServerProfilePage /> : <DesktopServerProfilePage />}
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
