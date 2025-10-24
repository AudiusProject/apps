import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'
import manifestJSON from '__STATIC_CONTENT_MANIFEST'

/* globals HTMLRewriter */

const assetManifest = JSON.parse(manifestJSON)

const SSR = true
const DEBUG = false
const BROWSER_CACHE_TTL_SECONDS = 60 * 60 * 24

let h1 = null

const routes = [
  { pattern: /^\/([^/]+)$/, name: 'user', keys: ['handle'] },
  {
    pattern: /^\/([^/]+)\/([^/]+)$/,
    name: 'track',
    keys: ['handle', 'title']
  },
  {
    pattern: /^\/([^/]+)\/playlist\/([^/]+)$/,
    name: 'playlist',
    keys: ['handle', 'title']
  },
  {
    pattern: /^\/([^/]+)\/album\/([^/]+)$/,
    name: 'album',
    keys: ['handle', 'title']
  }
]

function matchRoute(input) {
  for (const route of routes) {
    const match = route.pattern.exec(input)
    if (match) {
      const result = { name: route.name, params: {} }
      route.keys.forEach((key, index) => {
        result.params[key] = match[index + 1]
      })
      return result
    }
  }
  return null
}

function checkIsBot(val) {
  if (!val) {
    return false
  }
  const botTest =
    /discordbot|facebookexternalhit|gigabot|ia_archiver|meta-externalfetcher|linkbot|linkedinbot|reaper|slackbot|snap url preview service|telegrambot|twitterbot|whatsapp|whatsup|yeti|yodaobot|zend|zoominfobot|embedly|iframely/i
  return botTest.test(val)
}

function checkIsCrawler(val) {
  if (!val) {
    return false
  }
  const crawlerTest =
    /forcessr|ahrefs(bot|siteaudit)|altavista|baiduspider|bingbot|duckduckbot|googlebot|google-inspectiontool|msnbot|nextgensearchbot|yahoo|yandex/i
  return crawlerTest.test(val)
}

async function getMetadata(pathname, apiEndpoint) {
  if (pathname.startsWith('/scripts')) {
    return { metadata: null, name: null }
  }

  const route = matchRoute(pathname)
  if (!route) {
    return { metadata: null, name: null }
  }

  let apiRequestPath
  switch (route.name) {
    case 'user': {
      const { handle } = route.params
      if (!handle) return { metadata: null, name: null }
      apiRequestPath = `v1/users/handle/${handle}`
      break
    }
    case 'track': {
      const { handle, title } = route.params
      if (!handle || !title) return { metadata: null, name: null }
      apiRequestPath = `v1/tracks?permalink=${handle + '/' + title}`
      break
    }
    case 'playlist': {
      const { handle, title } = route.params
      if (!handle || !title) return { metadata: null, name: null }
      apiRequestPath = `v1/full/playlists/by_permalink/${handle}/${title}`
      break
    }
    case 'album': {
      const { handle, title } = route.params
      if (!handle || !title) return { metadata: null, name: null }
      apiRequestPath = `v1/full/playlists/by_permalink/${handle}/${title}`
      break
    }
    default:
      return { metadata: null, name: null }
  }
  try {
    const res = await fetch(`${apiEndpoint}/${apiRequestPath}`)
    if (res.status !== 200) {
      throw new Error(res.status)
    }
    const json = await res.json()
    return { metadata: json, name: route.name }
  } catch (e) {
    return { metadata: null, name: null }
  }
}

function clean(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

class SEOHandlerBody {
  element(element) {
    if (!h1) {
      return
    }
    const h1Tag = `<h1 id="audius-h1" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden;">${clean(
      h1
    )}</h1>`
    element.prepend(h1Tag, { html: true })
  }
}

class SEOHandlerHead {
  constructor(pathname, apiEndpoint, host) {
    self.pathname = pathname
    self.apiEndpoint = apiEndpoint
    self.host = host
  }

  async element(element) {
    const { metadata, name } = await getMetadata(
      self.pathname,
      self.apiEndpoint
    )

    if (!metadata || !name || !metadata.data || metadata.data.length === 0) {
      // We didn't parse this to anything we have custom tags for, so just return the default tags
      const tags = `<meta property="og:title" content="Audius - Empowering Creators">
      <meta name="description" content="Audius is a music streaming and sharing platform that puts power back into the hands of content creators." data-react-helmet="true">
      <meta property="og:description" content="Audius is a music streaming and sharing platform that puts power back into the hands of content creators.">
      <meta property="og:image" content="https://audius.co/ogImage.jpg">
      <meta name="twitter:title" content="Audius - Empowering Creators">
      <meta name="twitter:description" content="Audius is a music streaming and sharing platform that puts power back into the hands of content creators.">
      <meta name="twitter:image" content="https://audius.co/ogImage.jpg">
      <meta name="twitter:image:alt" content="The Audius Platform">`
      element.append(tags, { html: true })
      return
    }

    let title, description, ogDescription, image, permalink
    switch (name) {
      case 'user': {
        title = `${metadata.data.name} • Audius`
        h1 = metadata.data.name
        description = `Play ${metadata.data.name} on Audius and discover followers on Audius | Listen and stream tracks, albums, and playlists from your favorite artists on desktop and mobile`
        ogDescription = metadata.data.bio || description
        image = metadata.data.profile_picture
          ? metadata.data.profile_picture['480x480']
          : ''
        permalink = `/${metadata.data.handle}`
        break
      }
      case 'track': {
        title = `${metadata.data[0].title} by ${metadata.data[0].user.name} • Audius`
        h1 = metadata.data[0].title
        description = `Stream ${metadata.data[0].title} by ${metadata.data[0].user.name} on Audius | Stream similar artists to ${metadata.data[0].user.name} on desktop and mobile`
        ogDescription = metadata.data[0].description || description
        image = metadata.data[0].artwork
          ? metadata.data[0].artwork['480x480']
          : ''
        permalink = metadata.data[0].permalink
        break
      }
      case 'playlist': {
        title = `${metadata.data[0].playlist_name} by ${metadata.data[0].user.name} • Audius`
        h1 = metadata.data[0].playlist_name
        description = `Listen to ${metadata.data[0].playlist_name}, a playlist curated by ${metadata.data[0].user.name} on Audius | Stream tracks, albums, playlists on desktop and mobile`
        ogDescription = metadata.data[0].description || ''
        image = metadata.data[0].artwork
          ? metadata.data[0].artwork['480x480']
          : ''
        permalink = metadata.data[0].permalink
        break
      }
      case 'album': {
        title = `${metadata.data[0].playlist_name} by ${metadata.data[0].user.name} • Audius`
        h1 = metadata.data[0].playlist_name
        description = `Listen to ${metadata.data[0].playlist_name}, an album by ${metadata.data[0].user.name} on Audius | Stream tracks, albums, playlists on desktop and mobile`
        ogDescription = metadata.data[0].description || ''
        image = metadata.data[0].artwork
          ? metadata.data[0].artwork['480x480']
          : ''
        permalink = metadata.data[0].permalink
        break
      }
      default:
        return
    }
    const tags = `<title>${clean(title)}</title>
    <meta name="description" content="${clean(description)}">

    <link rel="canonical" href="https://${self.host}${encodeURI(permalink)}">
    <meta property="og:title" content="${clean(title)}">
    <meta property="og:description" content="${clean(ogDescription)}">
    <meta property="og:image" content="${image}">
    <meta property="og:url" content="https://${self.host}${encodeURI(permalink)}">
    <meta property="og:type" content="website" />

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${clean(title)}">
    <meta name="twitter:description" content="${clean(ogDescription)}">
    <meta name="twitter:image" content="${image}">

    <link rel="alternate" type="application/json+oembed" href="https://${self.host}/oembed?url=https://${self.host + encodeURI(permalink)}&format=json" title="${clean(title)}" />
    `
    element.append(tags, { html: true })
  }
}

async function getOEmbedResponse(url, apiEndpoint) {
  // Parse the URL query parameter to get the resource URL pathname
  const params = new URLSearchParams(url.search)
  const oembedUrl = params.get('url')
  if (!oembedUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }
  const pathname = new URL(oembedUrl).pathname

  // Get the metadata from the pathname
  const { metadata, name: entityType } = await getMetadata(
    pathname,
    apiEndpoint
  )

  // Ensure https
  const host = 'https://' + url.host

  // Playlist endoint is returning an array of playlists, so we need to handle that
  const data = Array.isArray(metadata.data) ? metadata.data[0] : metadata.data

  // Construct an embed player for tracks, playlists, and albums
  if (entityType !== 'user') {
    const title = `${data.title || data.playlist_name} by ${data.user.name} • Audius`
    const embed = `<iframe src="${host}/embed/${entityType}/${data.id}?flavor=card" width="100%" height="480" allow="encrypted-media" style="border: none;"></iframe>`
    return new Response(
      JSON.stringify({
        version: '1.0',
        type: 'rich',
        provider_name: 'Audius',
        provider_url: host,
        title: clean(title),
        description: data.description || '',
        html: embed,
        width: 500,
        height: 480,
        thumbnail_url: data.artwork ? data.artwork['480x480'] : undefined,
        thumbnail_width: 480,
        thumbnail_height: 480,
        author_name: data.user.name,
        author_url: `${host}/${data.user.handle}`,
        cache_age: 3600
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }

  // For user, return a simple link with thumbnail
  const title = `${data.name} • Audius`
  return new Response(
    JSON.stringify({
      version: '1.0',
      type: 'link',
      provider_name: 'Audius',
      provider_url: host,
      title: clean(title),
      thumbnail_url: data.profile_picture
        ? data.profile_picture['480x480']
        : '',
      thumbnail_width: 480,
      thumbnail_height: 480
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    }
  )
}

async function handleEvent(request, env, ctx) {
  const url = new URL(request.url)
  const { pathname, search, hash } = url

  const isUndefined = pathname === '/undefined'
  if (isUndefined) {
    return Response.redirect(url.origin, 302)
  }

  const apiEndpoint = env.API_URL

  const isSitemap = pathname.startsWith('/sitemaps')
  if (isSitemap) {
    const destinationURL = apiEndpoint + pathname + search + hash
    const newRequest = new Request(destinationURL, request)
    return await fetch(newRequest)
  }

  const isOEmbed = pathname.startsWith('/oembed')
  if (isOEmbed) {
    return await getOEmbedResponse(url, apiEndpoint)
  }

  const userAgent = request.headers.get('User-Agent') || ''

  const is204 = pathname === '/204'
  if (is204) {
    const response = new Response(undefined, { status: 204 })
    response.headers.set('access-control-allow-methods', '*')
    response.headers.set('access-control-allow-origin', '*')
    return response
  }

  const isBot = checkIsBot(userAgent)

  if (isBot) {
    const destinationURL = env.GA + pathname + search + hash
    const newRequest = new Request(destinationURL, request)
    newRequest.headers.set('host', env.GA)
    newRequest.headers.set('x-access-token', env.GA_ACCESS_TOKEN)

    return await fetch(newRequest)
  }

  const isEmbed = pathname.startsWith('/embed')
  if (isEmbed) {
    const destinationURL = env.EMBED + pathname + search + hash
    const newRequest = new Request(destinationURL, request)

    return await fetch(newRequest)
  }

  const options = {}

  try {
    if (DEBUG) {
      // customize caching
      options.cacheControl = {
        bypassCache: true
      }
    }

    // For now, only SSR for crawlers
    if (SSR && checkIsCrawler(userAgent)) {
      const ssrResponse = await env.SSR.fetch(request.clone())
      return ssrResponse
    } else {
      if (!isAssetUrl(request.url)) {
        // Map all non-asset requests to the root path
        options.mapRequestToAsset = (request) => {
          const url = new URL(request.url)
          url.pathname = `/`
          return mapRequestToAsset(new Request(url, request))
        }

        const asset = await getAsset(request, env, ctx, options)

        const rewritten = new HTMLRewriter()
          .on('head', new SEOHandlerHead(pathname, apiEndpoint, url.host))
          .on('body', new SEOHandlerBody())
          .transform(asset)

        return rewritten
      } else {
        const asset = await getAsset(request, env, ctx, options)

        // Adjust browser cache on assets that don't change frequently and/or
        // are given unique hashes when they do.
        const response = new Response(asset.body, asset)
        response.headers.set('Access-Control-Allow-Origin', '*')
        response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.set('cache-control', BROWSER_CACHE_TTL_SECONDS)

        return response
      }
    }
  } catch (e) {
    return new Response(e.message || e.toString(), { status: 500 })
  }
}

async function getAsset(request, env, ctx, options) {
  return await getAssetFromKV(
    {
      request,
      waitUntil: ctx.waitUntil.bind(ctx)
    },
    {
      ASSET_NAMESPACE: env.__STATIC_CONTENT,
      ASSET_MANIFEST: assetManifest,
      ...options
    }
  )
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

export default {
  fetch(request, env, ctx) {
    try {
      return handleEvent(request, env, ctx)
    } catch (e) {
      if (DEBUG) {
        return new Response(e.message || e.toString(), {
          status: 500
        })
      }
      return new Response('Internal Error', { status: 500 })
    }
  }
}
