import { useTrack } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { pick } from 'lodash'

import type { TextLinkProps } from '@audius/harmony-native'
import { TextLink } from '@audius/harmony-native'

type TrackLinkProps = Omit<TextLinkProps, 'to'> & {
  trackId: ID
}

export const TrackLink = ({ trackId, ...props }: TrackLinkProps) => {
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => pick(track, ['title', 'permalink'])
  })
  if (!partialTrack) return null
  const { title, permalink } = partialTrack

  return (
    <TextLink url={permalink} {...props}>
      {title}
    </TextLink>
  )
}
