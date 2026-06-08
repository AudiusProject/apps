import { getAssetFromKV, mapRequestToAsset } from '@cloudflare/kv-asset-handler'
import manifestJSON from '__STATIC_CONTENT_MANIFEST'

/* globals HTMLRewriter */

const assetManifest = JSON.parse(manifestJSON)

const SSR = true
const DEBUG = false
const BROWSER_CACHE_TTL_SECONDS = 60 * 60 * 24

/**
 * Valid Cache-Control values for static files. Hashed Vite assets under /assets
 * should be cached long-term; previously a numeric value was set, which is not
 * a valid header and led to "no cache" in Lighthouse / PSI.
 */
function cacheControlForPathname(pathname) {
  if (pathname.startsWith('/assets/') || pathname.startsWith('/scripts/')) {
    return 'public, max-age=31536000, immutable'
  }
  if (pathname.startsWith('/fonts/') || pathname.startsWith('/favicons/')) {
    return 'public, max-age=31536000, immutable'
  }
  return `public, max-age=${BROWSER_CACHE_TTL_SECONDS}`
}

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

function isCrawler(val) {
  if (!val) {
    return false
  }
  const crawlerTest =
    /forcessr|ahrefs(bot|siteaudit)|altavista|anthropic-ai|applebot|baiduspider|bingbot|bytespider|ccbot|chatgpt-user|claude-web|claudebot|claude-searchbot|claude-user|cohere-ai|dataforseobot|diffbot|discordbot|duckduckbot|embedly|facebookbot|facebookexternalhit|gigabot|google-extended|google-inspectiontool|googlebot|googleother|gptbot|ia_archiver|iaskspider|linkbot|linkedinbot|meta-externalfetcher|msnbot|nextgensearchbot|oai-searchbot|omgili|petalbot|perplexitybot|perplexity-user|pinterestbot|reaper|redditbot|rogerbot|semrushbot|slackbot|snap|telegrambot|twitterbot|webpilot|whatsapp|whatsup|yahoo|yandex|yeti|yodaobot|youbot|zend|zoominfobot/i
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
      apiRequestPath = `v1/playlists/by_permalink/${handle}/${title}`
      break
    }
    case 'album': {
      const { handle, title } = route.params
      if (!handle || !title) return { metadata: null, name: null }
      apiRequestPath = `v1/playlists/by_permalink/${handle}/${title}`
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
    const data = json.data
    // User-by-handle returns a single object; tracks/playlists return arrays
    if (route.name === 'user') {
      if (data == null || Array.isArray(data) || typeof data !== 'object') {
        return { metadata: null, name: null }
      }
    } else if (!Array.isArray(data) || data.length === 0) {
      return { metadata: null, name: null }
    }
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

    if (!metadata || !name || !metadata.data) {
      // We didn't parse this to anything we have custom tags for, so just return the default tags
      const baseUrl = `https://${self.host}`
      const schemaLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${baseUrl}/#organization`,
            name: 'Audius',
            url: baseUrl,
            sameAs: [
              'https://twitter.com/audius',
              'https://discord.gg/audius',
              'https://github.com/AudiusProject'
            ]
          },
          {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            url: baseUrl,
            name: 'Audius',
            publisher: { '@id': `${baseUrl}/#organization` }
          },
          {
            '@type': 'SoftwareApplication',
            name: 'Audius',
            applicationCategory: 'MusicApplication',
            operatingSystem: 'Web, iOS, Android'
          }
        ]
      })
      const faqLd = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Audius?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Audius is a music streaming and sharing platform for artists, labels, and fans. Artists can upload and share music, listeners can discover and stream it, and the platform is designed to put more power back into the hands of content creators. Audius is a decentralized platform, giving the community a more direct role in how the ecosystem grows and evolves.'
            }
          },
          {
            '@type': 'Question',
            name: 'Who is Audius made for?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Audius is made for the people pushing music scenes forward. Artists release music, run remix contests, and build unique experiences for their community. Record labels showcase their roster, host remix contests, and build a community around their brand. Music lovers engage with artists, discover new music, and help grow the scenes they care about.'
            }
          },
          {
            '@type': 'Question',
            name: "I'm an artist. What can I do on Audius?",
            acceptedAnswer: {
              '@type': 'Answer',
              text: "Artists on Audius consistently release music, run remix contests, and create unique experiences for their scene they can't find anywhere else. Demos, WIPs, and anything in between live here — it's not about perfection, it's about participation. Successful artists consistently engage, activate, and collab with their community."
            }
          },
          {
            '@type': 'Question',
            name: "I'm a record label. What can I do on Audius?",
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Record labels on Audius actively showcase their roster\'s music, discover artists, and create a community around their brand. They host remix contests, stay connected to emerging scenes, and build the momentum needed to support their releases everywhere else. Like artists, successful labels consistently engage, activate, and connect with their audience.'
            }
          },
          {
            '@type': 'Question',
            name: 'Are there any subscription plans or fees for using Audius?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Audius offers both free streaming and paid content options for both listeners and artists, with no subscription plans or fees required. You can enjoy unlimited free access to music, while artists have the option to offer premium content for sale. You can also support your favorite artists by sending them tips using $AUDIO tokens — 100% of tips go directly to the artists.'
            }
          },
          {
            '@type': 'Question',
            name: 'What devices are supported by Audius?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Audius is accessible on all modern Android and iOS devices, desktop applications for macOS, Windows, and Linux, and most web browsers (Chromium-based browsers like Google Chrome are recommended for the best experience). Visit audius.co/download to get the app for your device.'
            }
          },
          {
            '@type': 'Question',
            name: 'Is there a limit to how much I can upload to Audius?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'There is no limit to the number of tracks you can upload to your Audius profile. Each individual upload is restricted to a maximum of 200MB. For files exceeding 200MB, converting to 320kbps MP3 format before uploading is recommended.'
            }
          },
          {
            '@type': 'Question',
            name: 'I just love music. What can I do on Audius?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Music lovers on Audius keep the culture alive. They play a vital role in directly engaging, amplifying, and creating opportunities for artists to grow in their scene. While some just love the music, many professionally run collectives, promote events, and use the platform to expand what they\'re already building.'
            }
          },
          {
            '@type': 'Question',
            name: 'How do I sign up for Audius?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Visit audius.co/signup, enter your email address, create a password, choose a unique handle (which cannot be changed later), set your display name, optionally select favorite genres and follow artists to personalize your feed. You\'ll land directly in Audius ready to explore music and build your profile.'
            }
          }
        ]
      })
      const tags = `<title>Audius — Free Music Streaming for Artists, Labels & Fans</title>
      <link rel="canonical" href="${baseUrl}/">
      <meta property="og:url" content="${baseUrl}/">
      <meta property="og:type" content="website">
      <meta property="og:title" content="Audius — Free Music Streaming for Artists, Labels & Fans">
      <meta name="description" content="Audius is a music streaming and sharing platform that puts power back into the hands of content creators." data-react-helmet="true">
      <meta property="og:description" content="Audius is a music streaming and sharing platform that puts power back into the hands of content creators.">
      <meta property="og:image" content="https://audius.co/ogImage.jpg">
      <meta name="twitter:title" content="Audius — Free Music Streaming for Artists, Labels & Fans">
      <meta name="twitter:description" content="Audius is a music streaming and sharing platform that puts power back into the hands of content creators.">
      <meta name="twitter:image" content="https://audius.co/ogImage.jpg">
      <meta name="twitter:image:alt" content="The Audius Platform">
      <script type="application/ld+json">${schemaLd}</script>
      <script type="application/ld+json">${faqLd}</script>`
      element.append(tags, { html: true })
      return
    }

    let title, description, ogDescription, image, permalink
    switch (name) {
      case 'user': {
        const u = metadata.data
        const displayName =
          (u.name && String(u.name).trim()) || u.handle || 'Artist'
        title = `${displayName} • Audius`
        h1 = displayName
        description = `Play ${displayName} on Audius and discover followers on Audius | Listen and stream tracks, albums, and playlists from your favorite artists on desktop and mobile`
        ogDescription = u.bio || description
        image = u.profile_picture ? u.profile_picture['480x480'] : ''
        permalink = `/${u.handle}`
        break
      }
      case 'track': {
        title = `${metadata.data[0].title} by ${metadata.data[0].user.name} • Audius`
        h1 = metadata.data[0].title
        description = `Stream ${metadata.data[0].title} by ${metadata.data[0].user.name} on Audius`
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
  const userDisplayName =
    (data.name && String(data.name).trim()) || data.handle || 'Artist'
  const title = `${userDisplayName} • Audius`
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

    const isAppleAppSiteAssociation =
      pathname === '/.well-known/apple-app-site-association' ||
      pathname === '/apple-app-site-association'
    if (isAppleAppSiteAssociation) {
      // Cloudflare's asset handler treats extensionless paths as directories and
      // attempts to fetch `index.html`. Use a custom mapper that bypasses this.
      const aasaOptions = {
        mapRequestToAsset: (req) => {
          // Return request with exact path, preventing index.html lookup
          const url = new URL(req.url)
          url.pathname = '/.well-known/apple-app-site-association'
          return new Request(url.toString(), req)
        }
      }
      const asset = await getAsset(request, env, ctx, aasaOptions)
      const response = new Response(asset.body, asset)
      response.headers.set('Content-Type', 'application/json')
      response.headers.set(
        'cache-control',
        cacheControlForPathname(pathname)
      )
      response.headers.set('Access-Control-Allow-Origin', '*')
      return response
    }

    // For now, only SSR for crawlers
    if (SSR && isCrawler(userAgent)) {
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
        response.headers.set(
          'cache-control',
          cacheControlForPathname(pathname)
        )

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
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/llms.txt') ||
    pathname.startsWith('/agents.md') ||
    pathname.startsWith('/skill.md')
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
