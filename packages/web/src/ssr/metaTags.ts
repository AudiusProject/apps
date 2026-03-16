/**
 * SSR Meta Tags Utilities
 * Centralized meta tag generation for both SSR and client-side rendering
 */

import { fullCollectionPage, fullProfilePage, fullTrackPage } from 'utils/route'

// Image URLs - default OG uses the Audius logo on black from og.audius.co
export const DEFAULT_IMAGE_URL = 'https://og.audius.co/default'
export const AUDIO_REWARDS_IMAGE_URL =
  'https://download.audius.co/static-resources/audio-rewards.png'
export const SIGNUP_REF_IMAGE_URL =
  'https://download.audius.co/static-resources/signup_referral.png'

// Regex to detect Twitter/Discord bots that can embed players
const CAN_EMBED_USER_AGENT_REGEX = /(twitter|discord)/i

export type PlayableType = 'track' | 'playlist' | 'album'

export interface ExploreInfo {
  title: string
  description: string
  image: string
}

/**
 * Create SEO description with consistent formatting
 */
export const createSeoDescription = (msg: string, userPage?: boolean) => {
  if (userPage)
    return `${msg} | Listen and stream tracks, albums, and playlists from your favorite artists on desktop and mobile`
  return `${msg} | Stream tracks, albums, playlists on desktop and mobile`
}

/**
 * Get base public URL based on environment (used for canonical, og:url, etc.)
 */
export const getPublicUrl = (): string => {
  const env = process.env.VITE_ENVIRONMENT || 'development'
  switch (env) {
    case 'production':
      return 'https://audius.co'
    case 'staging':
      return 'https://staging.audius.co'
    default:
      return 'http://localhost:3000'
  }
}

/**
 * Generate embed player URL for Twitter/Discord
 */
export const getEmbedUrl = (type: PlayableType, hashId: string): string => {
  const publicUrl = getPublicUrl()
  return `${publicUrl}/embed/${type}/${hashId}?flavor=card&twitter=true`
}

/**
 * Check if User-Agent can show embed player (Twitter/Discord bots)
 */
export const canEmbed = (userAgent: string): boolean => {
  return CAN_EMBED_USER_AGENT_REGEX.test(userAgent)
}

/**
 * Generate deep link URL for mobile apps
 */
export const getAppUrl = (path: string): string => {
  return `audius:/${path}`
}

/**
 * Generate web URL for the page
 */
export const getWebUrl = (path: string): string => {
  const publicUrl = getPublicUrl()
  return `${publicUrl}${path}`
}

/**
 * Explore type to metadata mapping
 */
export const exploreMap: Record<string, ExploreInfo> = {}

/**
 * Get explore info for a given type
 */
export const getExploreInfo = (type?: string): ExploreInfo => {
  if (!type || !exploreMap[type]) {
    return {
      title: 'Explore',
      description: createSeoDescription('Explore featured content on Audius'),
      image: DEFAULT_IMAGE_URL
    }
  }
  return exploreMap[type]
}

/**
 * Homepage schema markup for Organization, WebSite, SoftwareApplication
 */
const getHomepageStructuredData = () => {
  const publicUrl = getPublicUrl()
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${publicUrl}/#organization`,
        name: 'Audius',
        url: publicUrl,
        sameAs: [
          'https://twitter.com/audius',
          'https://discord.gg/audius',
          'https://github.com/AudiusProject'
        ]
      },
      {
        '@type': 'WebSite',
        '@id': `${publicUrl}/#website`,
        url: publicUrl,
        name: 'Audius',
        publisher: { '@id': `${publicUrl}/#organization` }
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Audius',
        applicationCategory: 'MusicApplication',
        operatingSystem: 'Web, iOS, Android'
      }
    ]
  }
}

/**
 * Default meta tag context
 */
export const getDefaultContext = () => {
  const publicUrl = getPublicUrl()
  return {
    title: 'Audius — Free Music Streaming for Artists, Labels & Fans',
    description:
      'Audius is a music streaming and sharing platform that puts power back into the hands of content creators.',
    ogDescription:
      'Audius is a music streaming and sharing platform that puts power back into the hands of content creators.',
    image: DEFAULT_IMAGE_URL,
    imageAlt: 'The Audius Platform',
    thumbnail: true,
    canonicalUrl: `${publicUrl}/`,
    webUrl: `${publicUrl}/`,
    structuredData: getHomepageStructuredData()
  }
}

/**
 * Upload page meta tag context
 */
export const getUploadContext = () => ({
  title: 'Upload',
  description: 'Upload your tracks to Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * $AUDIO token page meta tag context
 */
export const getAudioContext = () => ({
  title: '$AUDIO & Rewards',
  description: 'Earn $AUDIO tokens while using the app!',
  image: AUDIO_REWARDS_IMAGE_URL,
  thumbnail: false
})

/**
 * Rewards page meta tag context
 */
export const getRewardsContext = () => ({
  title: '$AUDIO & Rewards',
  description: 'Earn $AUDIO tokens while using the app!',
  image: AUDIO_REWARDS_IMAGE_URL,
  thumbnail: false
})

/**
 * Signup page meta tag context
 */
export const getSignupContext = () => ({
  title: 'Signup',
  description: 'Sign up for Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Signup referral page meta tag context
 */
export const getSignupRefContext = (handle?: string) => ({
  title: handle
    ? `Invite to join Audius from @${handle}!`
    : 'Invite to join Audius',
  description: 'Sign up for Audius to earn $AUDIO tokens while using the app!',
  image: SIGNUP_REF_IMAGE_URL,
  thumbnail: false
})

/**
 * Download app page meta tag context
 */
export const getDownloadAppContext = () => ({
  title: 'Download',
  description: 'Artists Deserve More.',
  image: DEFAULT_IMAGE_URL,
  thumbnail: false
})

/**
 * Trending page meta tag context
 */
export const getTrendingContext = () => ({
  title: 'Trending',
  description: createSeoDescription(
    "Listen to what's trending on the Audius platform"
  ),
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Feed page meta tag context
 */
export const getFeedContext = () => ({
  title: 'Feed',
  description: 'Your personalized feed on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Library page meta tag context
 */
export const getLibraryContext = () => ({
  title: 'Library',
  description: 'Your music library on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * History page meta tag context
 */
export const getHistoryContext = () => ({
  title: 'History',
  description: 'Your listening history on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Dashboard page meta tag context
 */
export const getDashboardContext = () => ({
  title: 'Dashboard',
  description: 'Your artist dashboard on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Settings page meta tag context
 */
export const getSettingsContext = () => ({
  title: 'Settings',
  description: 'Manage your Audius account settings',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Notifications page meta tag context
 */
export const getNotificationsContext = () => ({
  title: 'Notifications',
  description: 'Your notifications on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Messages page meta tag context
 */
export const getMessagesContext = () => ({
  title: 'Messages',
  description: 'Your messages on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * Search page meta tag context
 */
export const getSearchContext = () => ({
  title: 'Search',
  description: 'Search for tracks, artists, and playlists on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

/**
 * SEO Utility functions to generate titles and descriptions
 * Used by both SSR and client-side rendering
 */

/**
 * User/profile page meta tag context
 */
export const getUserPageContext = ({
  handle,
  userName,
  bio,
  hashId
}: {
  handle: string
  userName: string
  bio: string
  hashId?: string
}) => {
  const pageTitle = userName
  const pageDescription = createSeoDescription(
    `Play ${userName} on Audius and discover followers on Audius`,
    true
  )
  const canonicalUrl = fullProfilePage(handle)
  const structuredData = {
    '@context': 'http://schema.googleapis.com/',
    '@type': 'MusicGroup',
    '@id': canonicalUrl,
    datePublished: null,
    url: canonicalUrl,
    name: userName,
    description: bio || pageDescription,
    potentialAction: {
      '@type': 'ListenAction',
      target: [
        {
          '@type': 'EntryPoint',
          urlTemplate: canonicalUrl
        }
      ],
      expectsAcceptanceOf: {
        '@type': 'Offer',
        category: 'free',
        eligibleRegion: []
      }
    }
  }

  return {
    title: pageTitle,
    description: pageDescription,
    canonicalUrl,
    structuredData,
    entityType: 'user' as const,
    hashId,
    thumbnail: true
  }
}

/**
 * Track page meta tag context.
 * Use isRemix and originalTrackCanonicalUrl so the original track can rank
 * above remixes for the track name: originals get "Original" in the snippet,
 * remixes get "Remix" and isBasedOn pointing to the original.
 */
export const getTrackPageContext = ({
  title,
  userName,
  permalink,
  releaseDate,
  hashId,
  isRemix = false,
  originalTrackCanonicalUrl
}: {
  title?: string
  userName?: string
  permalink?: string
  releaseDate?: string
  hashId?: string
  isRemix?: boolean
  originalTrackCanonicalUrl?: string
}) => {
  if (!title || !userName || !permalink) return {}
  const pageTitle = `${title} by ${userName}`
  const trackSnippet = `Stream ${title} by ${userName}`
  const pageDescription = isRemix
    ? `${trackSnippet} - Remix - on Audius`
    : `${trackSnippet} - Original - on Audius`
  const canonicalUrl = fullTrackPage(permalink)
  const structuredData: Record<string, unknown> = {
    '@context': 'http://schema.googleapis.com/',
    '@type': 'MusicRecording',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: title,
    description: pageDescription,
    datePublished: releaseDate ?? null,
    potentialAction: {
      '@type': 'ListenAction',
      target: [
        {
          '@type': 'EntryPoint',
          urlTemplate: canonicalUrl
        }
      ],
      expectsAcceptanceOf: {
        '@type': 'Offer',
        category: 'free',
        eligibleRegion: []
      }
    }
  }
  if (isRemix && originalTrackCanonicalUrl) {
    structuredData.isBasedOn = {
      '@type': 'MusicRecording',
      '@id': originalTrackCanonicalUrl
    }
  }

  return {
    title: pageTitle,
    description: pageDescription,
    canonicalUrl,
    structuredData,
    entityType: 'track' as const,
    hashId,
    thumbnail: false
  }
}

/**
 * Collection (playlist/album) page meta tag context
 */
export const getCollectionPageContext = ({
  playlistName,
  playlistId,
  userName,
  userHandle,
  isAlbum,
  permalink,
  hashId
}: {
  playlistName?: string
  playlistId?: number
  userName?: string
  userHandle?: string
  isAlbum?: boolean
  permalink?: string
  hashId?: string
}) => {
  if (!playlistName || !playlistId || !userName || !userHandle) return {}

  const pageTitle = `${playlistName} by ${userName}`
  const pageDescription = createSeoDescription(
    `Listen to ${playlistName} ${
      isAlbum ? 'an album' : 'a playlist curated'
    } by ${userName} on Audius`
  )
  const canonicalUrl = fullCollectionPage(
    userHandle,
    playlistName,
    playlistId,
    permalink,
    isAlbum
  )
  const structuredData = {
    '@context': 'http://schema.googleapis.com/',
    '@type': 'MusicAlbum',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: playlistName,
    description: pageDescription,
    potentialAction: {
      '@type': 'ListenAction',
      target: [
        {
          '@type': 'EntryPoint',
          urlTemplate: canonicalUrl
        }
      ],
      expectsAcceptanceOf: {
        '@type': 'Offer',
        category: 'free',
        eligibleRegion: []
      }
    }
  }

  return {
    title: pageTitle,
    description: pageDescription,
    canonicalUrl,
    structuredData,
    entityType: 'collection' as const,
    hashId,
    thumbnail: false
  }
}

/**
 * Coins page meta tag context
 */
export const getCoinsPageContext = () => {
  const pageTitle = 'Discover Artist Coins'
  const pageDescription =
    'Explore Artist Coins on Audius. Support your favorite artists, unlock exclusive perks, and become part of their community.'
  const canonicalUrl = 'https://audius.co/coins'

  return {
    title: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    canonicalUrl,
    image: DEFAULT_IMAGE_URL,
    thumbnail: true
  }
}

/**
 * Wallet page meta tag context
 */
export const getWalletPageContext = () => {
  const pageTitle = 'Wallet'
  const pageDescription =
    'Manage your Audius wallet. View your cash balance, artist coins, and linked wallets all in one place.'
  const canonicalUrl = 'https://audius.co/wallet'

  return {
    title: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    canonicalUrl,
    image: DEFAULT_IMAGE_URL,
    thumbnail: true
  }
}

/**
 * Cash page meta tag context
 */
export const getCashPageContext = () => {
  const pageTitle = 'Cash'
  const pageDescription =
    'Manage your Audius Cash. View your balance, transaction history, and cash-enabled features.'
  const canonicalUrl = 'https://audius.co/cash'

  return {
    title: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    canonicalUrl,
    image: DEFAULT_IMAGE_URL,
    thumbnail: true
  }
}
