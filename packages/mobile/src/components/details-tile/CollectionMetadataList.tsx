import { useCollectionMetadata } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'

import { Flex } from '@audius/harmony-native'

import { MetadataItem } from './MetadataItem'

type CollectionMetadataProps = {
  collectionId: ID
}

export const CollectionMetadataList = (props: CollectionMetadataProps) => {
  const { collectionId } = props
  const metadataItems = useCollectionMetadata({ collectionId })

  return (
    <Flex gap='l' w='100%' direction='row' wrap='wrap'>
      {metadataItems.map(({ label, id, value }) => (
        <MetadataItem key={id} label={label} value={value} />
      ))}
    </Flex>
  )
}
