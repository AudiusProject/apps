import { useCollectionMetadata } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { Flex } from '@audius/harmony'

import { MetadataItem } from 'components/entity/MetadataItem'

type CollectionMetadataListProps = {
  collectionId: ID
}

export const CollectionMetadataList = ({
  collectionId
}: CollectionMetadataListProps) => {
  const metadataItems = useCollectionMetadata({ collectionId })

  return (
    <Flex as='dl' direction='row' gap='l' wrap='wrap'>
      {metadataItems.map(({ id, label, value }) => (
        <MetadataItem key={id} label={label} value={value} />
      ))}
    </Flex>
  )
}
