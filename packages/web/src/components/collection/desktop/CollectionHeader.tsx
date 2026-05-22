import { useCallback } from 'react'

import { useCollection, useCurrentUserId } from '@audius/common/api'
import { ModalSource, isContentUSDCPurchaseGated } from '@audius/common/models'
import {
  EditCollectionValues,
  PurchaseableContentType,
  cacheCollectionsActions
} from '@audius/common/store'
import { dayjs, formatReleaseDate } from '@audius/common/utils'
import {
  Text,
  IconVisibilityHidden,
  Flex,
  IconCart,
  useTheme,
  MusicBadge,
  IconCalendarMonth
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { UserLink } from 'components/link'
import Skeleton from 'components/skeleton/Skeleton'
import { GatedContentSection } from 'components/track/GatedContentSection'
import { UserGeneratedText } from 'components/user-generated-text'

import { CollectionMetadataList } from '../CollectionMetadataList'
import { RepostsFavoritesStats } from '../components/RepostsFavoritesStats'
import { CollectionHeaderProps } from '../types'

import { Artwork } from './Artwork'
import { CollectionActionButtons } from './CollectionActionButtons'
import styles from './CollectionHeader.module.css'
import { EditableCollectionDescription } from './EditableCollectionDescription'
import { EditableCollectionTitle } from './EditableCollectionTitle'

const { editPlaylist } = cacheCollectionsActions

const messages = {
  premiumLabel: 'premium',
  by: 'By ',
  hidden: 'Hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate, withHour: true })}`
}

export const CollectionHeader = (props: CollectionHeaderProps) => {
  const {
    access,
    collectionId,
    ownerId,
    type,
    title,
    description,
    isOwner,
    isPlayable,
    isPublished,
    tracksLoading,
    loading,
    playing,
    previewing,
    onPlay,
    onPreview,
    userId,
    reposts,
    saves,
    onClickReposts,
    onClickFavorites,
    isStreamGated,
    streamConditions
  } = props

  const { spacing } = useTheme()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: fullCollection } = useCollection(collectionId)
  const {
    is_scheduled_release: isScheduledRelease,
    release_date: releaseDate,
    is_private: isPrivate
  } = fullCollection ?? {}

  const handleSaveTitle = useCallback(
    (next: string) => {
      if (!fullCollection || !collectionId) return
      dispatch(
        editPlaylist(collectionId, {
          ...fullCollection,
          playlist_name: next
        } as unknown as EditCollectionValues)
      )
    },
    [dispatch, fullCollection, collectionId]
  )

  const handleSaveDescription = useCallback(
    (next: string) => {
      if (!fullCollection || !collectionId) return
      dispatch(
        editPlaylist(collectionId, {
          ...fullCollection,
          description: next
        } as unknown as EditCollectionValues)
      )
    },
    [dispatch, fullCollection, collectionId]
  )

  const hasStreamAccess = access?.stream
  const shouldShowStats = !isPrivate || isOwner
  const shouldShowScheduledRelease =
    isScheduledRelease && releaseDate && dayjs(releaseDate).isAfter(dayjs())

  const renderStatsRow = (
    isLoading: boolean,
    forceMobileStyle: boolean = false
  ) => {
    if (isLoading) return <Skeleton height='20px' width='120px' />
    return shouldShowStats ? (
      <RepostsFavoritesStats
        repostCount={reposts}
        saveCount={saves}
        onClickReposts={onClickReposts}
        onClickFavorites={onClickFavorites}
        forceMobileStyle={forceMobileStyle}
      />
    ) : null
  }

  const isLoading = loading

  const isPremium =
    isStreamGated && isContentUSDCPurchaseGated(streamConditions)

  const renderTypeLabel = () =>
    isLoading ? (
      <Skeleton height='16px' width='84px' />
    ) : (
      <Flex gap='s' mt='s' alignItems='center'>
        {isPremium ? <IconCart size='s' color='subdued' /> : null}
        <Text variant='label' color='subdued'>
          {isPremium ? `${messages.premiumLabel} ` : ''}
          {type}
        </Text>
      </Flex>
    )

  const topSection = (
    <div className={styles.topSection}>
      <div className={styles.typeLabelCompact}>{renderTypeLabel()}</div>
      <div className={styles.artworkSection}>
        <Artwork collectionId={collectionId} isOwner={isOwner} />
      </div>
      <Flex direction='column' gap='xl' className={styles.infoSection}>
        <Flex direction='column' gap='xl'>
          <div className={styles.typeLabelRow}>{renderTypeLabel()}</div>
          <Flex
            direction='column'
            gap='s'
            className={styles.titleArtistSection}
          >
            {isLoading ? (
              <Skeleton height='48px' width='300px' />
            ) : isOwner ? (
              <EditableCollectionTitle value={title} onSave={handleSaveTitle} />
            ) : (
              <Text
                variant='heading'
                size='xl'
                className={styles.titleHeader}
                textAlign='left'
                css={{
                  fontSize: 'clamp(24px, calc(1.6cqi + 18.75px), 36px)',
                  lineHeight: 1.33
                }}
              >
                {title}
              </Text>
            )}
            {isLoading ? (
              <Skeleton height='24px' width='150px' />
            ) : userId !== null ? (
              <Text
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs
                }}
                className={styles.artistRow}
                variant='title'
                strength='weak'
                tag='h2'
                textAlign='left'
              >
                <Text color='subdued'>{messages.by}</Text>
                <UserLink userId={userId} popover variant='visible' />
              </Text>
            ) : null}
          </Flex>
          <div className={styles.statsDesktop}>{renderStatsRow(isLoading)}</div>
        </Flex>
      </Flex>
      <div className={styles.actionsSection}>
        {isLoading ? (
          <Skeleton height='64px' width='100%' />
        ) : (
          <CollectionActionButtons
            collectionId={collectionId}
            isPlayable={isPlayable}
            isPlaying={playing}
            isPreviewing={previewing}
            isPremium={isPremium}
            isOwner={isOwner}
            tracksLoading={tracksLoading}
            onPlay={onPlay}
            onPreview={onPreview}
          />
        )}
      </div>
      {!isPublished ? (
        <Flex
          w='240px'
          gap='s'
          justifyContent='flex-end'
          className={styles.searchSection}
        >
          {shouldShowScheduledRelease ? (
            <MusicBadge variant='accent' icon={IconCalendarMonth}>
              {messages.releases(releaseDate)}
            </MusicBadge>
          ) : (
            <MusicBadge icon={IconVisibilityHidden}>
              {messages.hidden}
            </MusicBadge>
          )}
        </Flex>
      ) : null}
    </div>
  )

  const descriptionSection = (
    <Flex
      gap='xl'
      direction='column'
      p='xl'
      backgroundColor='surface1'
      borderTop='strong'
      borderBottom='strong'
    >
      {isStreamGated && streamConditions ? (
        <GatedContentSection
          isLoading={isLoading}
          contentId={collectionId}
          contentType={PurchaseableContentType.ALBUM}
          streamConditions={streamConditions}
          hasStreamAccess={hasStreamAccess}
          isOwner={ownerId === currentUserId}
          ownerId={ownerId}
          source={ModalSource.CollectionDetails}
        />
      ) : null}
      {shouldShowStats ? (
        <div className={styles.statsInDescription}>
          {renderStatsRow(isLoading, true)}
        </div>
      ) : null}
      {isLoading ? (
        <Skeleton height='40px' width='100%' />
      ) : (
        <Flex gap='l' direction='column'>
          {isOwner ? (
            <EditableCollectionDescription
              value={description ?? ''}
              onSave={handleSaveDescription}
            />
          ) : description ? (
            <UserGeneratedText
              size='s'
              linkSource='collection page'
              css={{ textAlign: 'left' }}
            >
              {description}
            </UserGeneratedText>
          ) : null}
          <CollectionMetadataList collectionId={collectionId} />
        </Flex>
      )}
    </Flex>
  )
  return (
    <Flex direction='column' h='100%'>
      {topSection}
      {descriptionSection}
    </Flex>
  )
}
