import {
  fullCollectionPage,
  fullProfilePage,
  fullTrackPage,
  fullWeeklyRotationPage
} from 'utils/route'
import { getWeeklyRotationOgImageUrl } from 'utils/weeklyRotationPeriod'

export const DEFAULT_IMAGE_URL = 'https://og.audius.co/default'
export const AUDIO_REWARDS_IMAGE_URL =
  'https://download.audius.co/static-resources/audio-rewards.png'
export const SIGNUP_REF_IMAGE_URL =
  'https://download.audius.co/static-resources/signup_referral.png'

const CAN_EMBED_USER_AGENT_REGEX = /(twitter|discord)/i

const DISCORD_USER_AGENT_REGEX = /discord/i

export type PlayableType = 'track' | 'playlist' | 'album'

export interface ExploreInfo {
  title: string
  description: string
  image: string
}

export const createSeoDescription = (msg: string, userPage?: boolean) => {
  if (userPage)
    return `${msg} | Listen and stream tracks, albums, and playlists from your favorite artists on desktop and mobile`
  return `${msg} | Stream tracks, albums, playlists on desktop and mobile`
}

export const getPublicUrl = (): string => {
  const env = process.env.VITE_ENVIRONMENT || 'development'
  switch (env) {
    case 'production':
      return 'https://audius.co'
    default:
      return 'http://localhost:3000'
  }
}

export const getEmbedUrl = (type: PlayableType, hashId: string): string => {
  const publicUrl = getPublicUrl()
  return `${publicUrl}/embed/${type}/${hashId}?flavor=card&twitter=true`
}

export const canEmbed = (userAgent: string): boolean => {
  return CAN_EMBED_USER_AGENT_REGEX.test(userAgent)
}

export const isDiscord = (userAgent: string): boolean => {
  return DISCORD_USER_AGENT_REGEX.test(userAgent)
}

export const getAppUrl = (path: string): string => {
  return `audius:/${path}`
}

export const getWebUrl = (path: string): string => {
  const publicUrl = getPublicUrl()
  return `${publicUrl}${path}`
}

export const exploreMap: Record<string, ExploreInfo> = {
  'weekly-rotation': {
    title: 'Weekly Rotation',
    description: createSeoDescription(
      'A fresh mix of tracks picked for you, updated every Wednesday on Audius'
    ),
    image: DEFAULT_IMAGE_URL
  }
}

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

export const getNotFoundContext = () => ({
  title: 'Not Found',
  description: '404 - Page not found',
  ogDescription: '404 - Page not found',
  image: DEFAULT_IMAGE_URL,
  imageAlt: 'The Audius Platform',
  thumbnail: true
})

export const getUploadContext = () => ({
  title: 'Upload',
  description: 'Upload your tracks to Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getAudioContext = () => ({
  title: '$AUDIO & Rewards',
  description: 'Earn $AUDIO tokens while using the app!',
  image: AUDIO_REWARDS_IMAGE_URL,
  thumbnail: false
})

export const getRewardsContext = () => ({
  title: '$AUDIO & Rewards',
  description: 'Earn $AUDIO tokens while using the app!',
  image: AUDIO_REWARDS_IMAGE_URL,
  thumbnail: false
})

export const getSignupContext = () => ({
  title: 'Signup',
  description: 'Sign up for Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getSignupRefContext = (handle?: string) => ({
  title: handle
    ? `Invite to join Audius from @${handle}!`
    : 'Invite to join Audius',
  description: 'Sign up for Audius to earn $AUDIO tokens while using the app!',
  image: SIGNUP_REF_IMAGE_URL,
  thumbnail: false
})

export const getDownloadAppContext = () => ({
  title: 'Download',
  description: 'Artists Deserve More.',
  image: DEFAULT_IMAGE_URL,
  thumbnail: false
})

export const getTrendingContext = () => ({
  title: 'Trending',
  description: createSeoDescription(
    "Listen to what's trending on the Audius platform"
  ),
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getFeedContext = () => ({
  title: 'Feed',
  description: 'Your personalized feed on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getLibraryContext = () => ({
  title: 'Library',
  description: 'Your music library on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getHistoryContext = () => ({
  title: 'History',
  description: 'Your listening history on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getDashboardContext = () => ({
  title: 'Dashboard',
  description: 'Your artist dashboard on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getSettingsContext = () => ({
  title: 'Settings',
  description: 'Manage your Audius account settings',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getNotificationsContext = () => ({
  title: 'Notifications',
  description: 'Your notifications on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getMessagesContext = () => ({
  title: 'Messages',
  description: 'Your messages on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getSearchContext = () => ({
  title: 'Search',
  description: 'Search for tracks, artists, and playlists on Audius',
  image: DEFAULT_IMAGE_URL,
  thumbnail: true
})

export const getWeeklyRotationPageContext = ({
  handle,
  userName
}: {
  handle: string
  userName?: string
}) => {
  const displayName =
    (userName && String(userName).trim()) ||
    (handle && String(handle).trim()) ||
    'Listener'
  return {
    title: `${displayName}'s Weekly Rotation`,
    description: createSeoDescription(
      `A mix of tracks picked for ${displayName}, updated every Wednesday on Audius`
    ),
    image: getWeeklyRotationOgImageUrl(handle),
    imageAlt: `${displayName}'s Weekly Rotation on Audius`,
    canonicalUrl: fullWeeklyRotationPage(handle),
    thumbnail: false
  }
}

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
  const displayName =
    (userName && String(userName).trim()) ||
    (handle && String(handle).trim()) ||
    'Artist'
  const pageTitle = displayName
  const pageDescription = createSeoDescription(
    `Play ${displayName} on Audius and discover followers on Audius`,
    true
  )
  const canonicalUrl = fullProfilePage(handle)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    '@id': canonicalUrl,
    datePublished: null,
    url: canonicalUrl,
    name: displayName,
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
    '@context': 'https://schema.org',
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
    '@context': 'https://schema.org',
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

export const getCoinsPageContext = () => {
  const pageTitle = 'Discover Fan Clubs • Audius'
  const pageDescription =
    'Explore Artist Fan Clubs on Audius. Support your favorite artists, unlock exclusive perks, and become part of their community.'
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

export const getWalletPageContext = () => {
  const pageTitle = 'Wallet'
  const pageDescription =
    'Manage your Audius wallet. View your cash balance, fan clubs, and linked wallets all in one place.'
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
