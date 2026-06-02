import { useCallback } from 'react'

import { useCollection } from '@audius/common/api'
import { FavoriteType, type ID } from '@audius/common/models'
import {
  repostsUserListActions,
  favoritesUserListActions,
  RepostType
} from '@audius/common/store'
import { formatCount } from '@audius/common/utils'
import { useDispatch } from 'react-redux'

import { IconHeart, IconRepost } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import { VanityMetric } from './VanityMetrics'

const { setFavorite } = favoritesUserListActions
const { setRepost } = repostsUserListActions

type RepostsMetricProps = {
  collectionId: ID
}

export const RepostsMetric = (props: RepostsMetricProps) => {
  const { collectionId } = props

  const { data: repostCount } = useCollection(collectionId, {
    select: (collection) => collection.repost_count
  })
  const dispatch = useDispatch()
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    dispatch(setRepost(collectionId, RepostType.COLLECTION))
    navigation.push('Reposts', {
      id: collectionId,
      repostType: RepostType.COLLECTION
    })
  }, [collectionId, dispatch, navigation])

  if (!repostCount || repostCount === 0) return null

  return (
    <VanityMetric icon={IconRepost} onPress={handlePress}>
      {formatCount(repostCount)}
    </VanityMetric>
  )
}

type SavesMetricProps = {
  collectionId: ID
}

export const SavesMetric = (props: SavesMetricProps) => {
  const { collectionId } = props
  const { data: saveCount } = useCollection(collectionId, {
    select: (collection) => collection.save_count
  })

  const dispatch = useDispatch()
  const navigation = useNavigation()

  const handlePress = useCallback(() => {
    dispatch(setFavorite(collectionId, FavoriteType.PLAYLIST))
    navigation.push('Favorited', {
      id: collectionId,
      favoriteType: FavoriteType.PLAYLIST
    })
  }, [collectionId, dispatch, navigation])

  if (!saveCount || saveCount === 0) return null

  return (
    <VanityMetric icon={IconHeart} onPress={handlePress}>
      {formatCount(saveCount)}
    </VanityMetric>
  )
}
