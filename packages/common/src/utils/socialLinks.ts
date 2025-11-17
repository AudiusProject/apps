import type { User } from '~/models/User'

import { Nullable } from './typeUtils'

export const SOCIAL_BASE_URLS = {
  x: 'https://x.com/',
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@'
} as const

const PLATFORM_PATTERNS: Record<keyof typeof SOCIAL_BASE_URLS, RegExp> = {
  x: /^(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\//i,
  instagram: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
  tiktok: /^(?:https?:\/\/)?(?:www\.)?tiktok\.com\//i
}

type SocialHandlePlatform = keyof typeof SOCIAL_BASE_URLS
type OptionalNullable<T> = Nullable<T> | undefined

export type UserSocialSource = Partial<
  Pick<
    User,
    'twitter_handle' | 'instagram_handle' | 'tiktok_handle' | 'website'
  >
>

export const sanitizeSocialHandle = (
  handle: OptionalNullable<string>,
  platform: SocialHandlePlatform
): Nullable<string> => {
  if (!handle) {
    return null
  }

  const trimmedHandle = handle.trim()
  if (!trimmedHandle) {
    return null
  }

  let normalizedHandle = trimmedHandle
  if (PLATFORM_PATTERNS[platform].test(trimmedHandle)) {
    normalizedHandle = normalizedHandle.replace(PLATFORM_PATTERNS[platform], '')
  }

  normalizedHandle = normalizedHandle.replace(/^@/, '')
  normalizedHandle = normalizedHandle.split(/[/?#]/)[0]

  return normalizedHandle || null
}

export const sanitizeWebsiteUrl = (
  website: OptionalNullable<string>
): Nullable<string> => {
  if (!website) {
    return null
  }

  const trimmedWebsite = website.trim()
  if (!trimmedWebsite) {
    return null
  }

  const withProtocol = /^https?:\/\//i.test(trimmedWebsite)
    ? trimmedWebsite
    : `https://${trimmedWebsite}`

  try {
    const url = new URL(withProtocol)
    return url.toString()
  } catch {
    return null
  }
}

export const getUserSocialLinks = (user?: UserSocialSource | null) => {
  if (!user) {
    return []
  }

  const links: string[] = []

  const twitterHandle = sanitizeSocialHandle(user.twitter_handle, 'x')
  if (twitterHandle) {
    links.push(`${SOCIAL_BASE_URLS.x}${twitterHandle}`)
  }

  const instagramHandle = sanitizeSocialHandle(
    user.instagram_handle,
    'instagram'
  )
  if (instagramHandle) {
    links.push(`${SOCIAL_BASE_URLS.instagram}${instagramHandle}`)
  }

  const tiktokHandle = sanitizeSocialHandle(user.tiktok_handle, 'tiktok')
  if (tiktokHandle) {
    links.push(`${SOCIAL_BASE_URLS.tiktok}${tiktokHandle}`)
  }

  const website = sanitizeWebsiteUrl(user.website)
  if (website) {
    links.push(website)
  }

  return links.slice(0, 4)
}

export const socialLinksUtils = {
  SOCIAL_BASE_URLS,
  getUserSocialLinks,
  sanitizeSocialHandle,
  sanitizeWebsiteUrl
}
