// Weekly Rotation page SSR - meta tags only

import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { MetaTags } from 'components/meta-tags/MetaTags'
import { getIndexHtml } from 'ssr/getIndexHtml'
import {
  getAppUrl,
  getWebUrl,
  getWeeklyRotationPageContext
} from 'ssr/metaTags'

type WeeklyRotationPageContext = PageContextServer & {
  routeParams: {
    handle: string
  }
  pageProps: {
    user?: { handle?: string; name?: string }
  }
}

export default function render(pageContext: WeeklyRotationPageContext) {
  const { routeParams, pageProps, urlPathname } = pageContext
  const { user } = pageProps
  // Prefer the API's casing of the handle so the card URL matches what the
  // client will request.
  const handle = user?.handle ?? routeParams.handle

  const context = getWeeklyRotationPageContext({
    handle,
    userName: user?.name
  })

  const pageHtml = renderToString(
    <>
      <MetaTags
        {...context}
        appUrl={getAppUrl(urlPathname)}
        webUrl={getWebUrl(urlPathname)}
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
