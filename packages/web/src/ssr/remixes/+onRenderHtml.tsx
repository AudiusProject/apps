// Remixes page SSR - meta tags only

import type { Track, User } from '@audius/common/models'
import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { MetaTags } from 'components/meta-tags/MetaTags'
import { getIndexHtml } from 'ssr/getIndexHtml'
import { DEFAULT_IMAGE_URL, getAppUrl, getWebUrl } from 'ssr/metaTags'

type RemixesPageContext = PageContextServer & {
  pageProps: {
    track?: Track & { id: string; artwork?: { '1000x1000'?: string } }
    user?: User
  }
}

export default function render(pageContext: RemixesPageContext) {
  const { pageProps, urlPathname } = pageContext
  const { track, user } = pageProps

  // Build remixes-specific meta tags
  const title =
    track?.title && user?.name
      ? `Remixes of ${track.title} • ${user.name}`
      : 'Remixes'
  const description = track?.description ?? ''
  const image = track?.artwork?.['1000x1000'] ?? DEFAULT_IMAGE_URL

  const appUrl = getAppUrl(urlPathname)
  const webUrl = getWebUrl(urlPathname)

  const pageHtml = renderToString(
    <>
      <MetaTags
        title={title}
        description={description}
        image={image}
        thumbnail={false}
        appUrl={appUrl}
        webUrl={webUrl}
      />
      <div />
    </>
  )

  const helmet = Helmet.renderStatic()

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

  return escapeInject`${dangerouslySkipEscape(html)}`
}
