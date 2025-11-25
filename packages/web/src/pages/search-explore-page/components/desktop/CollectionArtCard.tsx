import { useCallback, useState } from 'react'

import { useCollection, useUser } from '@audius/common/api'
import { ID, SquareSizes } from '@audius/common/models'
import { Flex } from '@audius/harmony'
import { useNavigate } from 'react-router-dom'

import { CollectionImage } from 'components/collection/CollectionImage'
import { CollectionLink } from 'components/link/CollectionLink'
import { UserLink } from 'components/link/UserLink'
import PerspectiveCard from 'components/perspective-card/PerspectiveCard'
import { FavoriteStats } from 'components/stats/FavoriteStats'
import { RepostStats } from 'components/stats/RepostStats'
import { UserListEntityType } from 'store/application/ui/userListModal/types'

type CollectionArtCardProps = {
  id: ID
}

const ARTWORK_SIZE = 240

export const CollectionArtCard = ({ id }: CollectionArtCardProps) => {
  const [isPerspectiveDisabled] = useState(false)
  const navigate = useNavigate()
  const { data: partialCollection } = useCollection(id)

  const goToPlaylist = useCallback(() => {
    if (!partialCollection?.permalink) return
    navigate(partialCollection.permalink)
  }, [navigate, partialCollection?.permalink])

  const { data: user } = useUser(partialCollection?.playlist_owner_id)

  if (!partialCollection || !user) return null

  const { playlist_id, playlist_name } = partialCollection ?? {}
  const { user_id } = user
  return (
    <Flex column alignItems='center' gap='s'>
      <PerspectiveCard
        onClick={goToPlaylist}
        isDisabled={isPerspectiveDisabled}
      >
        <CollectionImage
          collectionId={id}
          size={SquareSizes.SIZE_480_BY_480}
          h={ARTWORK_SIZE}
          w={ARTWORK_SIZE}
        />
      </PerspectiveCard>
      <Flex
        column
        gap='xs'
        alignItems='center'
        ph='m'
        css={{ maxWidth: ARTWORK_SIZE }}
      >
        <CollectionLink collectionId={id} textVariant='title' size='l'>
          {playlist_name}
        </CollectionLink>
        <UserLink
          userId={user_id}
          popover
          textVariant='title'
          strength='weak'
          center
        />
      </Flex>
      <Flex gap='m' ph='m' css={{ maxWidth: ARTWORK_SIZE }}>
        <RepostStats
          id={playlist_id}
          entityType={UserListEntityType.COLLECTION}
          noText
        />
        <FavoriteStats
          id={playlist_id}
          entityType={UserListEntityType.COLLECTION}
          noText
        />
      </Flex>
    </Flex>
  )
}
