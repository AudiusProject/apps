/**
 * This worker handles SSR
 *
 * It's separate from the main worker because the app bundle is heavy
 * and causes slow cold starts. This way we can conditionally do SSR
 * and avoid cold starts in the general case.
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler'
// eslint-disable-next-line import/no-unresolved
import manifestJSON from '__STATIC_CONTENT_MANIFEST'
import { Toucan } from 'toucan-js'
import { renderPage } from 'vike/server'
try {
  // @ts-ignore
  await import('../../build-ssr/server/entry.mjs')
} catch (e) {
  // ok in dev / when SSR build hasn't been produced yet
}

const assetManifest = JSON.parse(manifestJSON)

const DEBUG = false
const BROWSER_CACHE_TTL_SECONDS = 60 * 60 * 24

export default {
  async fetch(request, env, ctx) {
    const sentry = env.SENTRY_DSN
      ? new Toucan({
          dsn: env.SENTRY_DSN,
          context: ctx,
          request
        })
      : null

    try {
      return await handleRequest(request, env, ctx)
    } catch (e) {
      if (sentry) {
        sentry.captureException(e)
      }
      if (DEBUG) {
        return new Response(e.message || e.toString(), { status: 500 })
      }
      return new Response('Internal Error', { status: 500 })
    }
  }
}

async function handleRequest(request, env, ctx) {
  if (!isAssetUrl(request.url)) {
    // Convert request headers to a plain object for Vike
    const headers = {}
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })

    const pageContextInit = {
      urlOriginal: request.url,
      headers
    }

    const pageContext = await renderPage(pageContextInit)

    const { httpResponse } = pageContext
    if (!httpResponse) {
      throw new Error(pageContext.errorWhileRendering)
    } else {
      const { statusCode: status, headers } = httpResponse
      // httpResponse.body can be a string or ReadableStream
      // Use getBody() if available, otherwise use body directly
      const body =
        typeof httpResponse.getBody === 'function'
          ? await httpResponse.getBody()
          : httpResponse.body

      return new Response(body, { headers, status })
    }
  } else {
    try {
      const asset = await getAssetFromKV(
        {
          request,
          waitUntil: ctx.waitUntil.bind(ctx)
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest
        }
      )

      const response = new Response(asset.body, asset)
      response.headers.set(
        'cache-control',
        `max-age=${BROWSER_CACHE_TTL_SECONDS}`
      )

      return response
    } catch (e) {
      return new Response('Asset not found', { status: 404 })
    }
  }
}

function isAssetUrl(url) {
  const { pathname } = new URL(url)
  return (
    pathname.startsWith('/assets') ||
    pathname.startsWith('/scripts') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/favicons') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/.well-known') ||
    pathname.startsWith('/documents') ||
    pathname.startsWith('/gitsha.json') ||
    pathname.startsWith('/actions.json') ||
    pathname.startsWith('/robots.txt')
  )
}
