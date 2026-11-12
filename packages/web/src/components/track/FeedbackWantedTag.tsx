import { useTrack } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { IconMessage, IconText } from '@audius/harmony'
import { pick } from 'lodash'

const messages = {
  feedbackWanted: 'Feedback Wanted'
}

/** Shown on tracks whose artist is asking for feedback. */
export const FeedbackWantedTag = ({ trackId }: { trackId: ID }) => {
  const { isEnabled } = useFeatureFlag(FeatureFlags.TRACK_FEEDBACK_REQUESTS)
  const { data: track } = useTrack(trackId, {
    select: (track) => pick(track, ['feedback_requested', 'comments_disabled'])
  })
  if (!isEnabled || !track?.feedback_requested || track.comments_disabled) {
    return null
  }
  return (
    <IconText icons={[{ icon: IconMessage }]}>
      {messages.feedbackWanted}
    </IconText>
  )
}
