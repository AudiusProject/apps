// Explore page SSR - meta tags only

import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { MetaTags } from 'components/meta-tags/MetaTags'
import { getIndexHtml } from 'ssr/getIndexHtml'
import { getExploreInfo } from 'ssr/metaTags'

type ExplorePageContext = PageContextServer & {
  routeParams: {
    type?: string
  }
}

export default function render(pageContext: ExplorePageContext) {
  const { routeParams, urlPathname } = pageContext

  // Handle /trending/playlists as a special case
  let type = routeParams.type
  if (urlPathname === '/trending/playlists') {
    type = 'trending-playlists'
  }

  const context = getExploreInfo(type)

  const pageHtml = renderToString(
    <>
      <MetaTags
        title={context.title}
        description={context.description}
        image={context.image}
        thumbnail
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

