import { getVideoEmbedUrl, parseVideoUrl } from '@audius/common/utils'
import { Box } from '@audius/harmony'

type VideoEmbedProps = {
  url: string | undefined | null
}

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
