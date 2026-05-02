import { getVideoEmbedUrl, parseVideoUrl } from '@audius/common/utils'
import { View } from 'react-native'
import { WebView } from 'react-native-webview'

import { useTheme } from '@audius/harmony-native'

type VideoEmbedProps = {
  /** Raw YouTube or Vimeo URL. Anything else is ignored (renders nothing). */
  url: string | undefined | null
}

/**
 * Inline 16:9 video player for YouTube / Vimeo URLs on native. Wraps the
 * platform's embed URL in a `WebView` sized 16:9. Returns null when the
 * URL isn't a parseable YouTube / Vimeo link — keeps callers simple
 * ("show only if present"). Mirrors the web `VideoEmbed` component.
 */
export const VideoEmbed = ({ url }: VideoEmbedProps) => {
  const { color, cornerRadius } = useTheme()
  const trimmed = url?.trim()
  const parsed = trimmed ? parseVideoUrl(trimmed) : null
  if (!parsed) return null

  const embedUrl = getVideoEmbedUrl(parsed)

  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: cornerRadius.s,
        overflow: 'hidden',
        backgroundColor: color.neutral.n800
      }}
    >
      <WebView
        source={{ uri: embedUrl }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        // Block opening external links inside the WebView so taps that
        // trigger a navigation (e.g. "Watch on YouTube" overlays) are
        // ignored — the embed stays focused on the video itself.
        onShouldStartLoadWithRequest={(req) =>
          req.url.startsWith('https://www.youtube.com/embed/') ||
          req.url.startsWith('https://player.vimeo.com/')
        }
      />
    </View>
  )
}
