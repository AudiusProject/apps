import { getVideoEmbedUrl, parseVideoUrl } from '@audius/common/utils'
import { Box } from '@audius/harmony'

type VideoEmbedProps = {
  /** Raw YouTube or Vimeo URL. Anything else is ignored (renders nothing). */
  url: string | undefined | null
}

/**
 * Inline 16:9 video player for YouTube / Vimeo URLs. Uses the platform's
 * embed URL behind a responsive wrapper so the iframe scales with the
 * surrounding container width. Returns null when the URL isn't a parseable
 * YouTube / Vimeo link — keeps callers simple ("show only if present").
 */
export const VideoEmbed = ({ url }: VideoEmbedProps) => {
  const trimmed = url?.trim()
  const parsed = trimmed ? parseVideoUrl(trimmed) : null
  if (!parsed) return null

  const embedUrl = getVideoEmbedUrl(parsed)

  return (
    <Box
      w='100%'
      css={(theme) => ({
        position: 'relative',
        // 16:9 aspect ratio — the iframe is positioned absolutely inside
        // and fills the box, so the height tracks the width without us
        // needing to know the viewport.
        paddingBottom: '56.25%',
        height: 0,
        overflow: 'hidden',
        borderRadius: theme.cornerRadius.s,
        backgroundColor: theme.color.neutral.n800
      })}
    >
      <iframe
        src={embedUrl}
        title='Embedded video'
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        allowFullScreen
        css={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 0
        }}
      />
    </Box>
  )
}
