export type VideoPlatform = 'youtube' | 'vimeo'

export type ParsedVideo = {
  platform: VideoPlatform
  videoId: string
}

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

const VIMEO_REGEX = /(?:vimeo\.com\/)(\d+)/

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

export const getVideoThumbnailUrl = (parsed: ParsedVideo): string | null => {
  if (parsed.platform === 'youtube') {
    return `https://img.youtube.com/vi/${parsed.videoId}/hqdefault.jpg`
  }
  return null
}

export const getVideoEmbedUrl = (parsed: ParsedVideo): string => {
  if (parsed.platform === 'youtube') {
    return `https://www.youtube.com/embed/${parsed.videoId}?origin=https://audius.co&enablejsapi=1`
  }
  return `https://player.vimeo.com/video/${parsed.videoId}`
}

export const getVideoWatchUrl = (parsed: ParsedVideo): string => {
  if (parsed.platform === 'youtube') {
    return `https://www.youtube.com/watch?v=${parsed.videoId}`
  }
  return `https://vimeo.com/${parsed.videoId}`
}

export const isValidVideoUrl = (url: string): boolean => {
  return parseVideoUrl(url) !== null
}
