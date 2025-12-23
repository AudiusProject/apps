import { useCallback } from 'react'

import { useCollection } from '@audius/common/api'
import { RepostSource, ID } from '@audius/common/models'
import { collectionsSocialActions } from '@audius/common/store'
import {
  IconRepost,
  IconButton,
  IconButtonProps,
  Tooltip
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

const { repostCollection, undoRepostCollection } = collectionsSocialActions

const messages = {
  reposted: 'Reposted',
  repost: 'Repost',
  unrepost: 'Unrepost'
}

type RepostButtonProps = Partial<IconButtonProps> & {
  collectionId: ID
}

export const RepostButton = (props: RepostButtonProps) => {
  const { collectionId, color, ...other } = props
  const dispatch = useDispatch()

  const { data: has_current_user_reposted } = useCollection(collectionId, {
    select: (collection) => collection.has_current_user_reposted
  })

  const handleRepost = useCallback(() => {
    if (has_current_user_reposted) {
      dispatch(undoRepostCollection(collectionId, RepostSource.COLLECTION_PAGE))
    } else {
      dispatch(repostCollection(collectionId, RepostSource.COLLECTION_PAGE))
    }
  }, [has_current_user_reposted, dispatch, collectionId])

  return (
    <Tooltip
      text={has_current_user_reposted ? messages.unrepost : messages.repost}
    >
      <IconButton
        color={color ?? (has_current_user_reposted ? 'active' : 'subdued')}
        icon={IconRepost}
        size='2xl'
        aria-label={
          has_current_user_reposted ? messages.unrepost : messages.repost
        }
        onClick={handleRepost}
        {...other}
      />
    </Tooltip>
  )
}
