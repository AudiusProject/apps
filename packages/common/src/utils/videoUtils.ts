export type VideoPlatform = 'youtube' | 'vimeo'

export type ParsedVideo = {
  platform: VideoPlatform
  videoId: string
}

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

const VIMEO_REGEX = /(?:vimeo\.com\/)(\d+)/

/**
 * Parse a video URL and extract the platform and video ID.
 * Supports YouTube and Vimeo URLs.
 */
export const parseVideoUrl = (url: string): ParsedVideo | null => {
  const youtubeMatch = url.match(YOUTUBE_REGEX)
  if (youtubeMatch) {
    return { platform: 'youtube', videoId: youtubeMatch[1] }
  }

  const vimeoMatch = url.match(VIMEO_REGEX)
  if (vimeoMatch) {
    return { platform: 'vimeo', videoId: vimeoMatch[1] }
  }

  return null
}

/**
 * Get the thumbnail URL for a video. Only YouTube provides static thumbnail URLs.
 * Vimeo requires an API call, so returns null.
 */
export const getVideoThumbnailUrl = (parsed: ParsedVideo): string | null => {
  if (parsed.platform === 'youtube') {
    return `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`
  }
  return null
}

/**
 * Get the embeddable URL for a video.
 */
export const getVideoEmbedUrl = (parsed: ParsedVideo): string => {
  if (parsed.platform === 'youtube') {
    return `https://www.youtube.com/embed/${parsed.videoId}`
  }
  return `https://player.vimeo.com/video/${parsed.videoId}`
}

/**
 * Get the watch URL for a video (for opening in a new tab).
 */
export const getVideoWatchUrl = (parsed: ParsedVideo): string => {
  if (parsed.platform === 'youtube') {
    return `https://www.youtube.com/watch?v=${parsed.videoId}`
  }
  return `https://vimeo.com/${parsed.videoId}`
}

/**
 * Check if a URL is a valid YouTube or Vimeo video URL.
 */
export const isValidVideoUrl = (url: string): boolean => {
  return parseVideoUrl(url) !== null
}
