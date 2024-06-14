import { useCollectionMetadata } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'

import { Flex } from '@audius/harmony-native'

import { MetadataItem } from './MetadataItem'

type CollectionMetadataProps = {
  collectionId: ID
}

/**
 * The additional metadata shown at the bottom of the Collection Screen Headers
 */
export const CollectionMetadataList = ({
  collectionId
}: CollectionMetadataProps) => {
  const metadataItems = useCollectionMetadata({ collectionId })

  return (
    <Flex gap='l' w='100%' direction='row' wrap='wrap'>
      {metadataItems.map((label) => (
        <MetadataItem key={label.id} label={label.label}>
          {label.value}
        </MetadataItem>
      ))}
    </Flex>
  )
}
