import { useCurrentCommentSection } from '@audius/common/context'

import type { TextLinkProps } from '@audius/harmony-native'
import { TextLink } from '@audius/harmony-native'
import { formatCommentTrackTimestamp } from 'app/utils/comments'

type TimestampLinkProps = {
  timestampSeconds: number
} & TextLinkProps

export const TimestampLink = (props: TimestampLinkProps) => {
  const { timestampSeconds, ...other } = props
  const { playTrack } = useCurrentCommentSection()

  return (
    <TextLink
      onPress={() => playTrack(timestampSeconds)}
      variant='visible'
      size='s'
      {...other}
    >
      {formatCommentTrackTimestamp(timestampSeconds)}
    </TextLink>
  )
}
