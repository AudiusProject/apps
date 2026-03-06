import { Helmet } from 'react-helmet'

import { env } from 'services/env'

const messages = {
  dotAudius: '• Audius',
  audius: 'Audius'
}

export type MetaTagsProps = {
  title?: string
  /**
   * Description of the page
   */
  description?: string
  /**
   * Description of the content, for example a Track description
   */
  ogDescription?: string
  image?: string
  imageAlt?: string
  canonicalUrl?: string
  structuredData?: object
  noIndex?: boolean
  /**
   * Entity type for OG URL generation
   */
  entityType?: 'user' | 'collection' | 'track'
  /**
   * Hash ID for OG URL generation (id field from entities)
   */
  hashId?: string
  /**
   * Whether to show embed player (for Twitter/Discord)
   */
  embed?: boolean
  /**
   * URL to the embed player (e.g. /embed/track/xyz?flavor=card&twitter=true)
   */
  embedUrl?: string
  /**
   * Deep link URL for mobile apps (e.g. audius://track/xyz)
   */
  appUrl?: string
  /**
   * Web URL for the current page (e.g. https://audius.co/track/xyz)
   */
  webUrl?: string
  /**
   * Whether the image shows as a small thumbnail version.
   * Controls twitter:card type (summary vs summary_large_image)
   */
  thumbnail?: boolean
}

/**
 * Generates the OG URL based on environment and entity type
 */
const generateOgUrl = (
  entityType?: 'user' | 'collection' | 'track',
  hashId?: string
): string | undefined => {
  if (!entityType || !hashId) {
    return undefined
  }

  // Get the base OG URL based on environment
  const baseOgUrl = 'https://og.audius.co'

  // Generate the path based on entity type
  const path = `/${entityType}/${hashId}`

  return `${baseOgUrl}${path}`
}

/**
 * This component is used to set the meta tags for a page.
 * This is important for SEO
 */
export const MetaTags = (props: MetaTagsProps) => {
  const {
    title,
    description,
    ogDescription,
    image,
    imageAlt,
    canonicalUrl,
    structuredData,
    noIndex = false,
    entityType,
    hashId,
    embed = false,
    embedUrl,
    appUrl,
    webUrl,
    thumbnail = true
  } = props

  const formattedTitle = title
    ? `${title} ${messages.dotAudius}`
    : messages.audius

  // Generate OG URL if entity type and hash ID are provided
  const ogUrl = generateOgUrl(entityType, hashId)

  // Determine twitter card type based on thumbnail and embed settings
  const getTwitterCardType = () => {
    if (thumbnail) return 'summary'
    if (embed && embedUrl) return 'player'
    return 'summary_large_image'
  }

  return (
    <>
      {noIndex ? (
        <Helmet>
          <meta name='robots' content='noindex'></meta>
        </Helmet>
      ) : null}

      <Helmet>
        <title>{formattedTitle}</title>
        <meta property='og:title' content={formattedTitle} />
        <meta name='twitter:title' content={formattedTitle} />
      </Helmet>

      {description ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta name='description' content={description} />
        </Helmet>
      ) : null}

      {ogDescription ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='og:description' content={ogDescription} />
          <meta name='twitter:description' content={ogDescription} />
        </Helmet>
      ) : null}

      {canonicalUrl || ogUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <link rel='canonical' href={canonicalUrl || ogUrl} />
        </Helmet>
      ) : null}

      {canonicalUrl || webUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='og:url' content={canonicalUrl || webUrl} />
        </Helmet>
      ) : null}

      {/* Image - use OG URL if available, otherwise use provided image */}
      {ogUrl || image ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='og:image' content={ogUrl ?? image} />
          <meta name='twitter:image' content={ogUrl ?? image} />
        </Helmet>
      ) : null}

      {/* Image dimensions for non-thumbnail images */}
      {(ogUrl || image) && !thumbnail ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='og:image:width' content='1000' />
          <meta property='og:image:height' content='1000' />
        </Helmet>
      ) : null}

      {imageAlt ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta name='twitter:image:alt' content={imageAlt} />
          <meta name='og:image:alt' content={imageAlt} />
        </Helmet>
      ) : null}

      {/* OG Type and Twitter Card */}
      <Helmet encodeSpecialCharacters={false}>
        <meta property='og:type' content='website' />
        <meta name='twitter:card' content={getTwitterCardType()} />
      </Helmet>

      {/* Twitter Player (for embeds) */}
      {embed && embedUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta name='twitter:player' content={embedUrl} />
          <meta name='twitter:player:width' content='480' />
          <meta name='twitter:player:height' content='480' />
        </Helmet>
      ) : null}

      {/* Twitter App Links */}
      {appUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta name='twitter:app:name:iphone' content='Audius Music' />
          <meta name='twitter:app:id:iphone' content='1491270519' />
          <meta name='twitter:app:url:iphone' content={appUrl} />
          <meta name='twitter:app:name:ipad' content='Audius Music' />
          <meta name='twitter:app:id:ipad' content='1491270519' />
          <meta name='twitter:app:url:ipad' content={appUrl} />
          <meta name='twitter:app:name:googleplay' content='Audius Music' />
          <meta name='twitter:app:id:googleplay' content='co.audius.app' />
          <meta name='twitter:app:url:googleplay' content={appUrl} />
        </Helmet>
      ) : null}

      {/* Farcaster Frame */}
      {webUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='fc:frame' content='vNext' />
          <meta property='fc:frame:image:aspect_ratio' content='1:1' />
          <meta property='fc:frame:button:1' content='Listen on Audius!' />
          <meta property='fc:frame:button:1:action' content='link' />
          <meta property='fc:frame:button:1:target' content={webUrl} />
          {/* Use OG URL for frame image if available, otherwise use provided image */}
          {ogUrl || image ? (
            <meta property='fc:frame:image' content={ogUrl ?? image} />
          ) : null}
        </Helmet>
      ) : null}

      {structuredData ? (
        <Helmet encodeSpecialCharacters={false}>
          <script type='application/ld+json'>
            {JSON.stringify(structuredData)}
          </script>
        </Helmet>
      ) : null}

      {canonicalUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <link
            rel='alternate'
            type='application/json+oembed'
            href={`${env.AUDIUS_URL}/oembed?url=${canonicalUrl}&format=json`}
            title={formattedTitle}
          />
        </Helmet>
      ) : null}
    </>
  )
}
