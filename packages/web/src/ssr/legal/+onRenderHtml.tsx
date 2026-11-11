import { renderToString } from 'react-dom/server'
import { Helmet } from 'react-helmet'
import { escapeInject, dangerouslySkipEscape } from 'vike/server'
import type { PageContextServer } from 'vike/types'

import { MetaTags } from 'components/meta-tags/MetaTags'
import { env } from 'services/env'
import { getIndexHtml } from 'ssr/getIndexHtml'

import LegalPage from './+Page'
import { legalDocuments } from './documents'

export default function render({ urlPathname }: PageContextServer) {
  const { title, documentPath } = legalDocuments[urlPathname.replace(/\/$/, '')]
  const documentUrl = `${env.BASENAME}${documentPath}`
  const pageHtml = renderToString(
    <>
      <MetaTags title={title} description={`Read the Audius ${title}.`} />
      <LegalPage title={title} documentUrl={documentUrl} />
    </>
  )
  const helmet = Helmet.renderStatic()
  const html = getIndexHtml()
    .replace(`<div id="root"></div>`, `<div id="root">${pageHtml}</div>`)
    .replace(
      `<meta property="helmet" />`,
      `${helmet.title.toString()}${helmet.meta.toString()}${helmet.link.toString()}`
    )

  return escapeInject`${dangerouslySkipEscape(html)}`
}
