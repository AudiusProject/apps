import { MouseEvent, ReactNode, useCallback } from 'react'

import { useCollection, useTrack } from '@audius/common/api'
import { AccessConditions, ID } from '@audius/common/models'
import { gatedContentSelectors } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import { Flex, Text, Tooltip } from '@audius/harmony'
import { useSelector } from 'react-redux'

import FavoriteButton from 'components/alt-button/FavoriteButton'
import RepostButton from 'components/alt-button/RepostButton'
import ShareButton from 'components/alt-button/ShareButton'

import { GatedConditionsPill } from './GatedConditionsPill'
import styles from './ViewerActionButtons.module.css'

const { getGatedContentStatusMap } = gatedContentSelectors

const messages = {
  share: 'Share',
  repost: 'Repost',
  unrepost: 'Unrepost',
  favorite: 'Favorite',
  unfavorite: 'Unfavorite'
}

type ViewerActionButtonProps = {
  contentId: ID // Collection or Track ID
  hasStreamAccess?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  rightActions?: ReactNode
  bottomBar?: ReactNode
  isDarkMode?: boolean
  isMatrixMode: boolean
  showIconButtons?: boolean
  onClickRepost: (e: MouseEvent) => void
  onClickFavorite: (e?: MouseEvent) => void
  onClickShare: (e?: MouseEvent) => void
  onClickGatedUnlockPill?: (e: MouseEvent) => void
}

type EntityDetails = {
  streamConditions: Nullable<AccessConditions>
  isUnlisted: boolean
  isFavorited: boolean
  isReposted: boolean
}

const useTrackEntityDetails = (id: ID): EntityDetails => {
  const { data: partialTrack } = useTrack(id, {
    select: (track) => ({
      isUnlisted: track?.is_unlisted,
      stream_conditions: track?.stream_conditions,
      has_current_user_saved: track?.has_current_user_saved,
      has_current_user_reposted: track?.has_current_user_reposted
    })
  })

  const {
    stream_conditions: streamConditions,
    has_current_user_saved: isFavorited,
    has_current_user_reposted: isReposted,
    isUnlisted
  } = partialTrack ?? {}

  return {
    streamConditions: streamConditions ?? null,
    isUnlisted: isUnlisted ?? false,
    isFavorited: isFavorited ?? false,
    isReposted: isReposted ?? false
  }
}

const useCollectionEntityDetails = (id: ID): EntityDetails => {
  const { data: partialCollection } = useCollection(id, {
    select: (collection) => ({
      is_private: collection?.is_private,
      stream_conditions: collection?.stream_conditions,
      has_current_user_saved: collection?.has_current_user_saved,
      has_current_user_reposted: collection?.has_current_user_reposted
    })
  })
  const {
    stream_conditions: streamConditions,
    has_current_user_saved: isFavorited,
    has_current_user_reposted: isReposted,
    is_private: isUnlisted
  } = partialCollection ?? {}

  return {
    streamConditions: streamConditions ?? null,
    isUnlisted: isUnlisted ?? false,
    isFavorited: isFavorited ?? false,
    isReposted: isReposted ?? false
  }
}

export const ViewerActionButtons = ({
  contentType,
  ...rest
}: ViewerActionButtonProps & { contentType: 'track' | 'collection' }) => {
  return contentType === 'track' ? (
    <TrackViewerActionButtons {...rest} />
  ) : (
    <CollectionViewerActionButtons {...rest} />
  )
}

const TrackViewerActionButtons = ({
  contentId,
  ...rest
}: ViewerActionButtonProps) => {
  const { streamConditions, isUnlisted, isFavorited, isReposted } =
    useTrackEntityDetails(contentId)
  return (
    <BaseViewerActionButtons
      streamConditions={streamConditions}
      isUnlisted={isUnlisted}
      isFavorited={isFavorited}
      isReposted={isReposted}
      contentId={contentId}
      {...rest}
    />
  )
}

const CollectionViewerActionButtons = ({
  contentId,
  ...rest
}: ViewerActionButtonProps) => {
  const { streamConditions, isUnlisted, isFavorited, isReposted } =
    useCollectionEntityDetails(contentId)
  return (
    <BaseViewerActionButtons
      streamConditions={streamConditions}
      isUnlisted={isUnlisted}
      isFavorited={isFavorited}
      isReposted={isReposted}
      contentId={contentId}
      {...rest}
    />
  )
}

const BaseViewerActionButtons = ({
  streamConditions,
  isUnlisted,
  isFavorited,
  isReposted,
  contentId,
  hasStreamAccess,
  isDisabled,
  isLoading,
  rightActions,
  bottomBar,
  isDarkMode,
  isMatrixMode,
  showIconButtons,
  onClickRepost,
  onClickFavorite,
  onClickShare,
  onClickGatedUnlockPill
}: ViewerActionButtonProps & EntityDetails) => {
  const gatedStatusMap = useSelector(getGatedContentStatusMap)
  const gatedStatus = contentId && gatedStatusMap[contentId]

  const repostLabel = isReposted ? messages.unrepost : messages.repost

  const onStopPropagation = useCallback((e: any) => e.stopPropagation(), [])

  if (streamConditions && !isLoading && !hasStreamAccess) {
    return (
      <Flex justifyContent='space-between' w='100%' alignItems='center'>
        <Text variant='title' size='s'>
          <GatedConditionsPill
            streamConditions={streamConditions}
            unlocking={gatedStatus === 'UNLOCKING'}
            onClick={onClickGatedUnlockPill}
            contentId={contentId}
            contentType={'track'}
          />
        </Text>
        <Flex>{rightActions}</Flex>
      </Flex>
    )
  }

  return (
    <Flex justifyContent='space-between' w='100%' alignItems='center'>
      {bottomBar}
      {!isLoading && showIconButtons && !isUnlisted ? (
        <Flex gap='2xl'>
          <Tooltip
            text={repostLabel}
            disabled={isDisabled}
            placement='top'
            mount='page'
          >
            <Flex css={{ position: 'relative' }}>
              <RepostButton
                aria-label={repostLabel}
                onClick={onClickRepost}
                isDisabled={isDisabled}
                isActive={isReposted}
                isDarkMode={!!isDarkMode}
                isMatrixMode={isMatrixMode}
              />
            </Flex>
          </Tooltip>
          <Tooltip
            text={isFavorited ? messages.unfavorite : messages.favorite}
            disabled={isDisabled}
            placement='top'
            mount='page'
          >
            <Flex css={{ position: 'relative' }}>
              <FavoriteButton
                onClick={onClickFavorite}
                isActive={isFavorited}
                isDisabled={isDisabled}
                isDarkMode={!!isDarkMode}
                isMatrixMode={isMatrixMode}
              />
            </Flex>
          </Tooltip>
          <Tooltip
            text={messages.share}
            disabled={isDisabled}
            placement='top'
            mount='page'
          >
            <Flex css={{ position: 'relative' }} onClick={onStopPropagation}>
              <ShareButton
                onClick={onClickShare}
                isDarkMode={!!isDarkMode}
                className={styles.iconButton}
                stopPropagation={false}
                isMatrixMode={isMatrixMode}
              />
            </Flex>
          </Tooltip>
        </Flex>
      ) : null}
      {!isLoading ? <Flex>{rightActions}</Flex> : null}
    </Flex>
  )
}
