import { TrackMetadataType, useTrackMetadata } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { Flex } from '@audius/harmony'
import { Mood } from '@audius/sdk'

import { MetadataItem } from 'components/entity/MetadataItem'
import { MOODS } from 'utils/Moods'

type TrackMetadataListProps = {
  trackId: ID
}

/**
 * The additional metadata shown at the bottom of the Track Page Header
 */
export const TrackMetadataList = (props: TrackMetadataListProps) => {
  const { trackId } = props
  const metadataItems = useTrackMetadata({
    trackId
  })

  const renderMood = (value: string) => {
    const moodInfo = MOODS[value as Mood]
    if (!moodInfo) return value
    return (
      <Flex alignItems='center' gap='xs'>
        {moodInfo.label} {moodInfo.icon}
      </Flex>
    )
  }

  return (
    <Flex as='dl' w='100%' gap='l' wrap='wrap'>
      {metadataItems.map(({ id, label, value, url }) => (
        <MetadataItem
          key={id}
          label={label}
          value={value}
          url={url}
          renderValue={id === TrackMetadataType.MOOD ? renderMood : undefined}
        />
      ))}
    </Flex>
  )
}
