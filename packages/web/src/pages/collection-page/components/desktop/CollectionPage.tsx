import { useCallback, useMemo } from 'react'

import { useFavoriteTrack, useUnfavoriteTrack } from '@audius/common/api'
import {
  Variant,
  Status,
  isContentUSDCPurchaseGated,
  ModalSource,
  Track,
  FavoriteSource,
  PlayableType
} from '@audius/common/models'
import {
  CollectionTrack,
  CollectionsPageType,
  usePremiumContentPurchaseModal,
  PurchaseableContentType
} from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { Divider, Flex, Paper, Text } from '@audius/harmony'
import { Id } from '@audius/sdk'

import { CollectionDogEar } from 'components/collection'
import { CollectionHeader } from 'components/collection/desktop/CollectionHeader'
import Page from 'components/page/Page'
import { SuggestedTracks } from 'components/suggested-tracks'
import { TracksTable } from 'components/tracks-table'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import { computeCollectionMetadataProps } from 'pages/collection-page/store/utils'
import { useCollectionPage } from 'pages/collection-page/useCollectionPage'
import DeletedPage from 'pages/deleted-page/DeletedPage'

import styles from './CollectionPage.module.css'

const messages = {
  noFilterMatches: 'No tracks match your search...'
}

const getMessages = (collectionType: 'album' | 'playlist') => ({
  emptyPage: {
    ownerTitle: 'Nothing here yet',
    ownerCta: 'Start adding tracks',
    visitor: `This ${collectionType} is empty...`
  },
  type: {
    playlist: 'Playlist',
    album: 'Album'
  },
  remove: 'Remove from this'
})

type EmptyContentProps = {
  text?: string | null
  isOwner: boolean
  isAlbum: boolean
}

const EmptyContent = (props: EmptyContentProps) => {
  const { isAlbum, isOwner, text: textProp } = props
  const messages = getMessages(isAlbum ? 'album' : 'playlist')
  return (
    <Flex column p='2xl' alignItems='center' gap='s'>
      <Text variant='title' size='l'>
        {(textProp ?? isOwner)
          ? messages.emptyPage.ownerTitle
          : messages.emptyPage.visitor}
      </Text>
      {isOwner ? <Text size='l'>{messages.emptyPage.ownerCta}</Text> : null}
    </Flex>
  )
}

const NoSearchResultsContent = () => {
  return (
    <Flex column p='2xl' alignItems='center' gap='s'>
      <Text variant='title' size='l'>
        {messages.noFilterMatches}
      </Text>
    </Flex>
  )
}

type CollectionPageProps = {
  type: CollectionsPageType
}

const CollectionPage = ({ type }: CollectionPageProps) => {
  const {
    collection,
    user,
    tracks,
    accountUserId,
    playing,
    previewing,
    status,
    trackCount,
    playlistId,
    allowReordering,
    isQueued,
    getFilteredData,
    onFilterChange,
    onPlay,
    onPreview,
    onClickRow,
    onClickRepostTrack,
    onSortTracks,
    onReorderTracks,
    onClickRemove,
    onClickReposts,
    onClickFavorites,
    title,
    description: pageDescription,
    canonicalUrl,
    structuredData
  } = useCollectionPage(type, false)

  const { onOpen: openPremiumContentModal } = usePremiumContentPurchaseModal()
  const openPurchaseModal = useRequiresAccountCallback(
    ({ track_id }: Track) => {
      openPremiumContentModal(
        { contentId: track_id, contentType: PurchaseableContentType.TRACK },
        { source: ModalSource.TrackListItem }
      )
    },
    [openPremiumContentModal]
  )

  const { mutate: favoriteTrack } = useFavoriteTrack()
  const { mutate: unfavoriteTrack } = useUnfavoriteTrack()
  const toggleSaveTrack = useCallback(
    (track: Track) => {
      if (track.has_current_user_saved) {
        unfavoriteTrack({
          trackId: track.track_id,
          source: FavoriteSource.COLLECTION_PAGE
        })
      } else {
        favoriteTrack({
          trackId: track.track_id,
          source: FavoriteSource.COLLECTION_PAGE
        })
      }
    },
    [favoriteTrack, unfavoriteTrack]
  )

  // Compute values needed for useMemo (handle undefined collection case)
  // These need to be computed before the conditional return to ensure hooks are always called
  const isAlbum = collection?.is_album ?? false
  const areAllTracksPremium =
    collection && tracks.entries.length > 0
      ? tracks.entries.every(
          (track) =>
            track.is_stream_gated &&
            isContentUSDCPurchaseGated(track.stream_conditions)
        )
      : false

  // useMemo must be called before any conditional returns
  const tracksTableColumns = useMemo(() => {
    const columns = [
      'playButton',
      'trackName',
      isAlbum ? undefined : 'artistName',
      isAlbum ? 'date' : 'addedDate',
      'length',
      areAllTracksPremium ? undefined : 'plays',
      'reposts',
      'overflowActions'
    ]
    return columns.filter(removeNullable)
  }, [areAllTracksPremium, isAlbum])

  // Now we can do conditional returns after all hooks
  if (!collection) return null

  const metadata = collection
  const statusValue = status

  // TODO: Consider dynamic lineups, esp. for caching improvement.
  const [dataSource, activeIndex] =
    tracks.status === Status.SUCCESS
      ? getFilteredData(tracks.entries)
      : [[], -1]
  const collectionLoading = statusValue === Status.LOADING
  const queuedAndPlaying = playing && isQueued()
  const queuedAndPreviewing = previewing && isQueued()
  const tracksLoading =
    trackCount > 0 &&
    (tracks.status === Status.LOADING || tracks.status === Status.IDLE)

  const duration =
    dataSource.reduce(
      (duration: number, entry: CollectionTrack) =>
        duration + entry.duration || 0,
      0
    ) ?? 0

  const playlistOwnerName = user?.name ?? ''
  const playlistOwnerHandle = user?.handle ?? ''
  const playlistOwnerId = user?.user_id ?? null
  const isOwner = accountUserId === playlistOwnerId

  const typeTitle = type
  const customEmptyText = null
  const access =
    metadata !== null && 'access' in metadata ? metadata?.access : null

  const {
    isEmpty,
    lastModifiedDate,
    releaseDate,
    playlistName,
    description,
    isPrivate,
    playlistSaveCount,
    playlistRepostCount
  } = computeCollectionMetadataProps(metadata, tracks)
  const numTracks = tracks.entries.length
  const areAllTracksDeleted = tracks.entries.every((track) => track.is_delete)
  // areAllTracksPremium and isAlbum are already computed above for useMemo

  const isPlayable = !areAllTracksDeleted && numTracks > 0

  // Handle deleted collections
  if ((metadata?.is_delete || metadata?._marked_deleted) && user) {
    return (
      <DeletedPage
        title={title ?? ''}
        description={pageDescription ?? ''}
        canonicalUrl={canonicalUrl ?? ''}
        structuredData={structuredData}
        playable={{
          metadata,
          type: metadata?.is_album ? PlayableType.ALBUM : PlayableType.PLAYLIST
        }}
        user={user}
      />
    )
  }

  const topSection = (
    <CollectionHeader
      access={access}
      collectionId={playlistId!}
      userId={playlistOwnerId}
      loading={collectionLoading}
      tracksLoading={tracksLoading}
      type={typeTitle}
      title={playlistName ?? ''}
      artistName={playlistOwnerName ?? ''}
      artistHandle={playlistOwnerHandle ?? ''}
      description={description}
      isOwner={isOwner}
      isAlbum={isAlbum}
      numTracks={numTracks}
      isPlayable={isPlayable}
      lastModifiedDate={lastModifiedDate}
      releaseDate={releaseDate}
      duration={duration}
      isPublished={!isPrivate}
      reposts={playlistRepostCount}
      saves={playlistSaveCount}
      playing={queuedAndPlaying}
      previewing={queuedAndPreviewing}
      // Actions
      onFilterChange={onFilterChange}
      onPlay={onPlay}
      onPreview={onPreview}
      onClickReposts={onClickReposts}
      onClickFavorites={onClickFavorites}
      ownerId={playlistOwnerId}
      isStreamGated={
        metadata?.variant === Variant.USER_GENERATED
          ? metadata?.is_stream_gated
          : null
      }
      streamConditions={
        metadata?.variant === Variant.USER_GENERATED
          ? metadata?.stream_conditions
          : null
      }
    />
  )

  const messages = getMessages(isAlbum ? 'album' : 'playlist')
  return (
    <Page
      title={title}
      description={pageDescription}
      canonicalUrl={canonicalUrl}
      structuredData={structuredData}
      entityType='collection'
      hashId={playlistId ? Id.parse(playlistId) : undefined}
      containerClassName={styles.pageContainer}
      contentClassName={styles.pageContent}
      fromOpacity={1}
      scrollableSearch
    >
      <Paper column mb='unit-10' css={{ minWidth: 774 }}>
        <CollectionDogEar collectionId={playlistId ?? 0} borderOffset={0} />
        <div className={styles.topSectionWrapper}>{topSection}</div>
        {!collectionLoading && isEmpty ? (
          <EmptyContent
            isOwner={isOwner}
            isAlbum={isAlbum}
            text={customEmptyText}
          />
        ) : !collectionLoading && dataSource.length === 0 ? (
          <NoSearchResultsContent />
        ) : (
          <div className={styles.tableWrapper}>
            <TracksTable
              // @ts-ignore
              columns={tracksTableColumns}
              wrapperClassName={styles.tracksTableWrapper}
              key={playlistName}
              loading={collectionLoading}
              userId={accountUserId}
              playing={playing}
              activeIndex={activeIndex}
              data={dataSource}
              onClickRow={onClickRow}
              onClickFavorite={toggleSaveTrack}
              onClickRemove={isOwner ? onClickRemove : undefined}
              onClickRepost={onClickRepostTrack}
              onClickPurchase={openPurchaseModal}
              onReorder={onReorderTracks}
              onSort={onSortTracks}
              isReorderable={
                accountUserId !== null &&
                accountUserId === playlistOwnerId &&
                allowReordering
              }
              removeText={`${messages.remove} ${
                isAlbum ? messages.type.album : messages.type.playlist
              }`}
              isAlbumPage={isAlbum}
              isAlbumPremium={
                !!metadata && 'is_stream_gated' in metadata
                  ? metadata?.is_stream_gated
                  : false
              }
            />
          </div>
        )}
      </Paper>

      {!collectionLoading && isOwner && !isAlbum ? (
        <Flex column gap='2xl' pv='2xl' w='100%' css={{ minWidth: 774 }}>
          <Divider />
          <SuggestedTracks collectionId={playlistId!} />
        </Flex>
      ) : null}
    </Page>
  )
}

export default CollectionPage
