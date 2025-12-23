import { ChangeEvent, useCallback, useState } from 'react'

import { useCollection, useCurrentUserId } from '@audius/common/api'
import { ModalSource, isContentUSDCPurchaseGated } from '@audius/common/models'
import { PurchaseableContentType } from '@audius/common/store'
import { dayjs, formatReleaseDate } from '@audius/common/utils'
import {
  Text,
  IconVisibilityHidden,
  IconPencil,
  Flex,
  TextInput,
  TextInputSize,
  IconSearch,
  IconCart,
  useTheme,
  MusicBadge,
  IconCalendarMonth
} from '@audius/harmony'
import cn from 'classnames'
import { pick } from 'lodash'
import { Link } from 'react-router-dom'

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

const messages = {
  filterPlaylist: 'Search in playlist...',
  filterAlbum: 'Search in album...',
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
    onFilterChange,
    reposts,
    saves,
    onClickReposts,
    onClickFavorites,
    isStreamGated,
    streamConditions
  } = props

  const { spacing } = useTheme()
  const { data: currentUserId } = useCurrentUserId()
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) =>
      pick(collection, [
        'is_scheduled_release',
        'release_date',
        'permalink',
        'is_private'
      ])
  })
  const {
    is_scheduled_release: isScheduledRelease,
    release_date: releaseDate,
    permalink,
    is_private: isPrivate
  } = partialCollection ?? {}
  const [artworkLoading, setIsArtworkLoading] = useState(true)
  const [filterText, setFilterText] = useState('')

  const hasStreamAccess = access?.stream
  const shouldShowStats = type !== 'album' && (!isPrivate || isOwner)
  const shouldShowScheduledRelease =
    isScheduledRelease && releaseDate && dayjs(releaseDate).isAfter(dayjs())

  const handleFilterChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const newFilterText = e.target.value
      setFilterText(newFilterText)
      onFilterChange?.(e)
    },
    [onFilterChange]
  )

  const handleLoadArtwork = useCallback(() => {
    setIsArtworkLoading(false)
  }, [])

  const renderStatsRow = (isLoading: boolean) => {
    if (isLoading) return <Skeleton height='20px' width='120px' />
    return shouldShowStats ? (
      <RepostsFavoritesStats
        repostCount={reposts}
        saveCount={saves}
        onClickReposts={onClickReposts}
        onClickFavorites={onClickFavorites}
      />
    ) : null
  }

  const isLoading = loading || artworkLoading

  const isPremium =
    isStreamGated && isContentUSDCPurchaseGated(streamConditions)

  const topSection = (
    <Flex gap='xl' p='l' backgroundColor='white'>
      <Artwork
        collectionId={collectionId}
        callback={handleLoadArtwork}
        isOwner={isOwner}
      />
      <Flex
        direction='column'
        gap='xl'
        justifyContent='space-between'
        css={{ minWidth: 400 }}
      >
        <Flex direction='column' gap='xl'>
          {isLoading ? (
            <Skeleton height='24px' width='200px' />
          ) : (
            <Flex gap='s' mt='s' alignItems='center'>
              {isPremium ? <IconCart size='s' color='subdued' /> : null}
              <Text variant='label' color='subdued'>
                {isPremium ? `${messages.premiumLabel} ` : ''}
                {type}
              </Text>
            </Flex>
          )}
          <Flex direction='column' gap='s'>
            <Flex
              as={isOwner ? Link : 'span'}
              css={{ background: 0, border: 0, padding: 0, margin: 0 }}
              gap='s'
              alignItems='center'
              className={cn({
                [styles.editableTitle]: isOwner
              })}
              // @ts-ignore -- Flex Link doesn't type `to` correctly
              to={
                isOwner
                  ? { pathname: `${permalink}/edit`, search: '?focus=name' }
                  : undefined
              }
            >
              {isLoading ? (
                <Skeleton height='48px' width='300px' />
              ) : (
                <>
                  <Text
                    variant='heading'
                    size='xl'
                    className={cn(styles.titleHeader)}
                    textAlign='left'
                  >
                    {title}
                  </Text>

                  {!isLoading && isOwner ? (
                    <IconPencil className={styles.editIcon} color='subdued' />
                  ) : null}
                </>
              )}
            </Flex>
            {isLoading ? (
              <Skeleton height='24px' width='150px' />
            ) : userId !== null ? (
              <Text
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs
                }}
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
          <div>{renderStatsRow(isLoading)}</div>
        </Flex>

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
      </Flex>
      <Flex
        w='240px'
        gap='s'
        justifyContent='flex-end'
        css={{ position: 'absolute', right: spacing.l, top: spacing.l }}
      >
        {!isPublished ? (
          shouldShowScheduledRelease ? (
            <MusicBadge variant='accent' icon={IconCalendarMonth}>
              {messages.releases(releaseDate)}
            </MusicBadge>
          ) : (
            <MusicBadge icon={IconVisibilityHidden}>
              {messages.hidden}
            </MusicBadge>
          )
        ) : onFilterChange ? (
          <TextInput
            label={
              type === 'album' ? messages.filterAlbum : messages.filterPlaylist
            }
            placeholder={
              type === 'album' ? messages.filterAlbum : messages.filterPlaylist
            }
            startIcon={IconSearch}
            onChange={handleFilterChange}
            value={filterText}
            size={TextInputSize.EXTRA_SMALL}
            className={styles.searchInput}
            css={{
              width: '100%',
              '& input': {
                fontSize: 'var(--harmony-font-xs)',
                fontWeight: 'var(--harmony-font-medium)',
                marginLeft: '2px',
                background: 'unset !important',
                color: 'var(--harmony-neutral) !important'
              },
              '& .contentContainer': {
                background: 'var(--harmony-white)',
                boxShadow: '0 2px 5px 0 var(--search-bar-shadow)',
                borderRadius: '4px',
                border: 'none',
                padding: '0 12px',
                height: '32px',
                minHeight: '32px'
              }
            }}
          />
        ) : null}
      </Flex>
    </Flex>
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

      {isLoading ? (
        <Skeleton height='40px' width='100%' />
      ) : (
        <Flex gap='l' direction='column'>
          {description ? (
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
