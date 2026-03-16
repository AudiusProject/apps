import type { ReactElement } from 'react'

import { TrackMetadataType, useTrackMetadata } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import type { Mood } from '@audius/sdk/services'
import { Image } from 'react-native'

import { Flex, spacing } from '@audius/harmony-native'
import { moodMap } from 'app/utils/moods'

import { MetadataItem } from './MetadataItem'

type TrackMetadataListProps = {
  trackId: ID
}

/**
 * The additional metadata shown at the bottom of the Track Screen and Collection Screen Headers
 */
export const TrackMetadataList = ({ trackId }: TrackMetadataListProps) => {
  const metadataItems = useTrackMetadata({ trackId })

  const renderMood = (value: string, link: ReactElement) => (
    <Flex direction='row' gap='xs' alignItems='center'>
      <Image
        source={moodMap[value as Mood]}
        style={{ height: spacing.l, width: spacing.l }}
      />
      {link}
    </Flex>
  )

  return (
    <Flex gap='l' w='100%' direction='row' wrap='wrap'>
      {metadataItems.map(({ id, label, value, url }) => {
        return (
          <MetadataItem
            key={id}
            label={label}
            value={value}
            url={url}
            renderValue={id === TrackMetadataType.MOOD ? renderMood : undefined}
          />
        )
      })}
    </Flex>
  )
}
