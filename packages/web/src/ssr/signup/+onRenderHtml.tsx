// Signup page SSR - meta tags only
// Supports referral links via ?ref= or ?rf= query params

import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { MetaTags } from 'components/meta-tags/MetaTags'
import { getIndexHtml } from 'ssr/getIndexHtml'
import { getSignupContext, getSignupRefContext } from 'ssr/metaTags'

type SignupPageContext = PageContextServer & {
  urlParsed: {
    search: Record<string, string>
  }
}

export default function render(pageContext: SignupPageContext) {
  const { urlParsed } = pageContext
  const { ref, rf } = urlParsed.search ?? {}

  // If there's a referral param, use the signup ref context
  const hasReferral = ref ?? rf
  const context = hasReferral
    ? getSignupRefContext(ref ?? rf)
    : getSignupContext()

  const pageHtml = renderToString(
    <>
      <MetaTags
        title={context.title}
        description={context.description}
        image={context.image}
        thumbnail={context.thumbnail}
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
