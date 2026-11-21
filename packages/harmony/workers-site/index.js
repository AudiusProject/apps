import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'

const DEBUG = false

addEventListener('fetch', (event) => {
  try {
    event.respondWith(handleEvent(event))
  } catch (e) {
    if (DEBUG) {
      return event.respondWith(
        new Response(e.message || e.toString(), {
          status: 500
        })
      )
    }
    event.respondWith(new Response('Internal Error', { status: 500 }))
  }
})

async function handleEvent(event) {
  const url = new URL(event.request.url)
  const { pathname } = url

  const isUndefined = pathname === '/undefined'
  if (isUndefined) {
    return Response.redirect(url.origin, 302)
  }

  const options = {}
  try {
    if (DEBUG) {
      options.cacheControl = {
        bypassCache: true
      }
    }

    return await getAssetFromKV(event, options)
  } catch (e) {
    return new Response(e.message || e.toString(), { status: 500 })
  }
}
