/**
 * SEO Utlity functions to generate titles and descriptions
 */

import { fullCollectionPage, fullProfilePage, fullTrackPage } from './route'

export const createSeoDescription = (msg: string, userPage?: boolean) => {
  if (userPage)
    return `${msg} | Listen and stream tracks, albums, and playlists from your favorite artists on desktop and mobile`
  return `${msg} | Stream tracks, albums, playlists on desktop and mobile`
}

export const getUserPageSEOFields = ({
  handle,
  userName,
  bio,
  userId
}: {
  handle: string
  userName: string
  bio: string
  userId?: number
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
    entityId: userId
  }
}

export const getTrackPageSEOFields = ({
  title,
  userName,
  permalink,
  releaseDate,
  trackId
}: {
  title?: string
  userName?: string
  permalink?: string
  releaseDate?: string
  trackId?: number
}) => {
  if (!title || !userName || !permalink) return {}
  const pageTitle = `${title} by ${userName}`
  const pageDescription = `Stream ${title} by ${userName} on Audius | Stream similar artists to ${userName} on desktop and mobile`
  const canonicalUrl = fullTrackPage(permalink)
  const structuredData = {
    '@context': 'http://schema.googleapis.com/',
    '@type': 'MusicRecording',
    '@id': canonicalUrl,
    url: canonicalUrl,
    name: title,
    description: pageDescription,
    datePublished: releaseDate || null,
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
    entityType: 'track' as const,
    entityId: trackId
  }
}

export const getCollectionPageSEOFields = ({
  playlistName,
  playlistId,
  userName,
  userHandle,
  isAlbum,
  permalink
}: {
  playlistName?: string
  playlistId?: number
  userName?: string
  userHandle?: string
  isAlbum?: boolean
  permalink?: string
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
    entityId: playlistId
  }
}

export const getCoinsPageSEOFields = () => {
  const pageTitle = 'Discover Artist Coins'
  const pageDescription =
    'Explore Artist Coins on Audius. Support your favorite artists, unlock exclusive perks, and become part of their community.'
  const canonicalUrl = 'https://audius.co/coins'

  return {
    title: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    canonicalUrl
  }
}

export const getWalletPageSEOFields = () => {
  const pageTitle = 'Wallet'
  const pageDescription =
    'Manage your Audius wallet. View your cash balance, artist coins, and linked wallets all in one place.'
  const canonicalUrl = 'https://audius.co/wallet'

  return {
    title: pageTitle,
    description: pageDescription,
    ogDescription: pageDescription,
    canonicalUrl
  }
}

export const getDefaultSEOFields = () => ({
  title: 'Audius - Empowering Creators',
  description:
    'Audius is a music streaming and sharing platform that puts power back into the hands of content creators.',
  ogDescription:
    'Audius is a music streaming and sharing platform that puts power back into the hands of content creators.',
  image: 'https://audius.co/ogImage.jpg',
  imageAlt: 'The Audius Platform'
})
