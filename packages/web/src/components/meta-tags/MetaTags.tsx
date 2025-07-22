import { Id } from '@audius/sdk'
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
   * Entity ID for OG URL generation (will be converted to hash-id)
   */
  entityId?: number
}

/**
 * Generates the OG URL based on environment and entity type
 */
const generateOgUrl = (
  entityType?: 'user' | 'collection' | 'track',
  entityId?: number
): string | undefined => {
  if (!entityType || entityId === undefined) {
    return undefined
  }

  // Get the base OG URL based on environment
  const baseOgUrl =
    env.ENVIRONMENT === 'staging'
      ? 'https://og.staging.audius.co'
      : 'https://og.audius.co'

  // Convert entity ID to hash-id
  const hashId = Id.parse(entityId)

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
    entityId
  } = props

  const formattedTitle = title
    ? `${title} ${messages.dotAudius}`
    : messages.audius

  // Generate OG URL if entity type and ID are provided
  const ogUrl = generateOgUrl(entityType, entityId)

  return (
    <>
      {/* noIndex */}
      {noIndex ? (
        <Helmet>
          <meta name='robots' content='noindex'></meta>
        </Helmet>
      ) : null}

      {/* Title */}
      <Helmet>
        <title>{formattedTitle}</title>
        <meta property='og:title' content={formattedTitle} />
        <meta name='twitter:title' content={formattedTitle} />
      </Helmet>

      {/* Description */}
      {description ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta name='description' content={description} />
        </Helmet>
      ) : null}

      {/* OG Description */}
      {ogDescription ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='og:description' content={ogDescription} />
          <meta name='twitter:description' content={ogDescription} />
        </Helmet>
      ) : null}

      {/* Canonical URL - use OG URL if available, otherwise use provided canonicalUrl */}
      {ogUrl || canonicalUrl ? (
        <Helmet encodeSpecialCharacters={false}>
          <link rel='canonical' href={ogUrl || canonicalUrl} />
          <meta property='og:url' content={ogUrl || canonicalUrl} />
        </Helmet>
      ) : null}

      {/* Image */}
      {image ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta property='og:image' content={image} />
          <meta name='twitter:image' content={image} />
        </Helmet>
      ) : null}

      {imageAlt ? (
        <Helmet encodeSpecialCharacters={false}>
          <meta name='twitter:image:alt' content={imageAlt} />
          <meta name='og:image:alt' content={imageAlt} />
        </Helmet>
      ) : null}

      <Helmet encodeSpecialCharacters={false}>
        <meta property='og:type' content='website' />
        <meta name='twitter:card' content='summary' />
      </Helmet>

      {structuredData ? (
        <Helmet encodeSpecialCharacters={false}>
          <script type='application/ld+json'>
            {JSON.stringify(structuredData)}
          </script>
        </Helmet>
      ) : null}
    </>
  )
}
