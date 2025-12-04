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
  createEmotionServer(harmonyCache as any)

type TrackPageContext = PageContextServer & {
  pageProps: {
    user: User & { id: string }
  }
}

export default function render(pageContext: TrackPageContext) {
  const { pageProps, headers, urlPathname } = pageContext
  const { user } = pageProps
  const { id, name, bio } = user ?? {}
  // Use lower case since cache lookup by handle will lowercase it
  const handle = user?.handle?.toLowerCase() ?? ''
  const userAgent = headers?.['user-agent'] ?? ''
  const isMobile = isMobileUserAgent(userAgent)

  const seoMetadata = getUserPageSEOFields({
    handle,
    userName: name,
    bio: bio ?? '',
    hashId: id
  })

  const pageHtml = renderToString(
    <ServerWebPlayer isMobile={isMobile} location={urlPathname}>
      <>
        <MetaTags {...seoMetadata} />
        {user ? (
          isMobile ? (
            <MobileServerProfilePage user={user} />
          ) : (
            <DesktopServerProfilePage user={user} />
          )
        ) : null}
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
