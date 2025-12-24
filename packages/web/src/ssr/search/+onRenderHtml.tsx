// Search page SSR - meta tags only

import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'

import { MetaTags } from 'components/meta-tags/MetaTags'
import { getIndexHtml } from 'ssr/getIndexHtml'
import { getSearchContext } from 'ssr/metaTags'

export default function render() {
  const context = getSearchContext()

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

