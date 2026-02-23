import { useTrack } from '@audius/common/api'
import { SquareSizes, ID } from '@audius/common/models'
import { Box, Text } from '@audius/harmony'
import { pick } from 'lodash'

import { SelectedValue } from 'components/data-entry/ContextualMenu'
import { UserLink } from 'components/link'
import { TrackArtwork } from 'components/track/TrackArtwork'

const messages = {
  by: 'By'
}

type TrackInfoProps = {
  trackId: ID
}

export const TrackInfo = (props: TrackInfoProps) => {
  const { trackId } = props

  const { data: track } = useTrack(trackId, {
    select: (track) => pick(track, ['title', 'owner_id'])
  })

  if (!track) return null

  return (
    <SelectedValue>
      <TrackArtwork
        trackId={trackId}
        size={SquareSizes.SIZE_150_BY_150}
        mr='xs'
        css={{ minHeight: 24, minWidth: 24 }}
      />
      <Text variant='body' color='default'>
        {track.title} <Text color='subdued'>{messages.by}</Text>{' '}
        <Box css={{ display: 'inline-flex' }}>
          <UserLink userId={track.owner_id} />
        </Box>
      </Text>
    </SelectedValue>
  )
}
