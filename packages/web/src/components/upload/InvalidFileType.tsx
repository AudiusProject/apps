import { ALLOWED_MAX_AUDIO_SIZE_BYTES } from '@audius/common/utils'
import { Paper, PaperProps, Text, useTheme } from '@audius/harmony'
import { animated, Spring } from '@react-spring/web'

type InvalidFileReason = 'type' | 'size' | 'corrupted'

type InvalidFileTypeProps = {
  reason: InvalidFileReason
} & PaperProps

const AnimatedPaper = animated(Paper)

const messages: Record<InvalidFileReason, string> = {
  type: 'Unsupported File Type',
  corrupted:
    'File is corrupted. Please ensure it is playable and stored locally.',
  size: `File Too Large (Max ${ALLOWED_MAX_AUDIO_SIZE_BYTES / 1000000}MB)`
}

export const InvalidFileType = ({ reason, ...other }: InvalidFileTypeProps) => {
  const { color } = useTheme()
  return (
    <Spring
      from={{ opacity: 0.6 }}
      to={{ opacity: 1 }}
      key='invalid-file-type'
      config={{ duration: 200 }}
    >
      {(animProps) => (
        <AnimatedPaper
          inline
          pv='s'
          ph='l'
          alignItems='center'
          css={{
            backgroundColor: color.special.red,
            maxWidth: 320
          }}
          style={animProps}
          {...other}
        >
          <Text
            variant='body'
            size='l'
            strength='strong'
            textAlign='center'
            color='white'
          >
            {messages[reason]}
          </Text>
        </AnimatedPaper>
      )}
    </Spring>
  )
}
