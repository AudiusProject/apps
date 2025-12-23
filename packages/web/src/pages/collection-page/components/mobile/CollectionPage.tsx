import { memo, useEffect, useContext } from 'react'

import { useGatedContentAccessMap } from '@audius/common/hooks'
import { Status, PlayableType, ID } from '@audius/common/models'
import { CollectionTrack, CollectionsPageType } from '@audius/common/store'
import { Id } from '@audius/sdk'

import CollectionHeader from 'components/collection/mobile/CollectionHeader'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, {
  LeftPreset,
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import TrackList from 'components/track/mobile/TrackList'
import { computeCollectionMetadataProps } from 'pages/collection-page/store/utils'
import { useCollectionPage } from 'pages/collection-page/useCollectionPage'
import DeletedPage from 'pages/deleted-page/DeletedPage'

import styles from './CollectionPage.module.css'

const messages = {
  emptyPlaylist: (collectionType: 'album' | 'playlist') =>
    `This ${collectionType} is empty...`
}

const EmptyTrackList = ({
  isAlbum,
  customEmptyText
}: {
  isAlbum: boolean
  customEmptyText?: string | null
}) => {
  return (
    <div className={styles.emptyListContainer}>
      <div>
        {customEmptyText ||
          messages.emptyPlaylist(isAlbum ? 'album' : 'playlist')}
      </div>
    </div>
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
    playlistId,
    getPlayingUid,
    isQueued,
    onPlay,
    onPreview,
    onClickRow,
    onHeroTrackShare,
    onHeroTrackSave,
    onHeroTrackRepost,
    onClickMobileOverflow,
    onClickFavorites,
    onClickReposts,
    title,
    description: pageDescription,
    canonicalUrl,
    structuredData
  } = useCollectionPage(type, true)

  // All hooks must be called before any conditional returns
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  const { setHeader } = useContext(HeaderContext)

  useEffect(() => {
    if (collection) {
      // If the collection is deleted, don't update the nav
      if (collection.is_delete || collection._marked_deleted) {
        return
      }
      setLeft(LeftPreset.BACK)
      setRight(RightPreset.KEBAB)
      setCenter(CenterPreset.LOGO)
    }
  }, [setLeft, setCenter, setRight, collection])

  useEffect(() => {
    setHeader(null)
  }, [setHeader])

  // useGatedContentAccessMap must be called before conditional returns
  const trackAccessMap = useGatedContentAccessMap(tracks.entries)

  // Now we can do conditional returns after all hooks
  if (!collection) return null

  const metadata = collection

  // TODO: Consider dynamic lineups, esp. for caching improvement.
  const collectionLoading = status === Status.LOADING
  const queuedAndPlaying = playing && isQueued()
  const queuedAndPreviewing = previewing && isQueued()
  const tracksLoading = tracks.status === Status.LOADING
  const duration =
    tracks.entries?.reduce(
      (duration: number, entry: CollectionTrack) =>
        duration + entry.duration || 0,
      0
    ) ?? 0

  const playlistOwnerName = user?.name ?? ''
  const playlistOwnerHandle = user?.handle ?? ''
  const playlistOwnerId = user?.user_id ?? null
  const isOwner = accountUserId === playlistOwnerId

  const isSaved = metadata?.has_current_user_saved
  const isPublishing = metadata?._is_publishing ?? false
  const access =
    metadata !== null && 'access' in metadata ? metadata?.access : null

  const typeTitle = type
  const customEmptyText = null

  const {
    isEmpty,
    lastModifiedDate,
    releaseDate,
    playlistName,
    description,
    isPrivate,
    isAlbum,
    playlistSaveCount,
    playlistRepostCount,
    isReposted
  } = computeCollectionMetadataProps(metadata, tracks)

  const togglePlay = (uid: string, trackId: ID) => {
    // Find the actual track record from tracks.entries
    const trackRecord = tracks.entries.find((entry) => entry.uid === uid)
    if (trackRecord) {
      // Format it as CollectionPageTrackRecord
      const formattedRecord = {
        ...trackRecord,
        key: `${trackRecord.title}_${trackRecord.uid}_0`,
        name: trackRecord.title,
        artist: trackRecord.user.name,
        handle: trackRecord.user.handle,
        date: trackRecord.dateAdded || trackRecord.created_at,
        time: trackRecord.duration,
        plays:
          trackRecord.is_unlisted && accountUserId !== trackRecord.owner_id
            ? -1
            : trackRecord.play_count
      }
      onClickRow(formattedRecord)
    }
  }
  const playingUid = getPlayingUid()

  const trackList = tracks.entries.map((entry) => {
    const { isFetchingNFTAccess, hasStreamAccess } = trackAccessMap[
      entry.track_id
    ] ?? { isFetchingNFTAccess: false, hasStreamAccess: true }
    const isLocked = !isFetchingNFTAccess && !hasStreamAccess
    return {
      isLoading: false,
      isUnlisted: entry.is_unlisted,
      isSaved: entry.has_current_user_saved,
      isReposted: entry.has_current_user_reposted,
      isActive: playingUid === entry.uid,
      isPlaying: queuedAndPlaying && playingUid === entry.uid,
      artistName: entry?.user?.name,
      artistHandle: entry?.user?.handle,
      trackTitle: entry.title,
      ddexApp: entry.ddex_app,
      permalink: entry.permalink,
      trackId: entry.track_id,
      uid: entry.uid,
      isStreamGated: entry.is_stream_gated,
      isDeleted: entry.is_delete || !!entry?.user?.is_deactivated,
      isLocked,
      hasStreamAccess,
      streamConditions: entry.stream_conditions
    }
  })
  const numTracks = trackList.length
  const areAllTracksDeleted = trackList.every((track) => track.isDeleted)
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

  return (
    <MobilePageContainer
      title={title}
      description={pageDescription}
      canonicalUrl={canonicalUrl}
      structuredData={structuredData}
      entityType='collection'
      hashId={playlistId ? Id.parse(playlistId) : undefined}
    >
      <div className={styles.collectionContent}>
        <div>
          <CollectionHeader
            access={access}
            collectionId={playlistId ?? 0}
            userId={user?.user_id ?? 0}
            loading={collectionLoading}
            tracksLoading={tracksLoading}
            type={typeTitle}
            ddexApp={metadata?.ddex_app}
            title={playlistName}
            artistName={playlistOwnerName}
            artistHandle={playlistOwnerHandle}
            description={description}
            isOwner={isOwner}
            isAlbum={isAlbum}
            numTracks={numTracks}
            isPlayable={isPlayable}
            lastModifiedDate={lastModifiedDate}
            releaseDate={releaseDate}
            duration={duration}
            isPublished={!isPrivate}
            isPublishing={isPublishing}
            isSaved={isSaved}
            saves={playlistSaveCount}
            playing={queuedAndPlaying}
            previewing={queuedAndPreviewing}
            reposts={playlistRepostCount}
            isReposted={isReposted}
            isStreamGated={metadata?.is_stream_gated ?? null}
            streamConditions={metadata?.stream_conditions ?? null}
            ownerId={playlistOwnerId}
            // Actions
            onPlay={onPlay}
            onPreview={onPreview}
            onShare={onHeroTrackShare}
            onSave={onHeroTrackSave}
            onRepost={onHeroTrackRepost}
            onClickFavorites={onClickFavorites}
            onClickReposts={onClickReposts}
            onClickMobileOverflow={onClickMobileOverflow}
          />
        </div>
        <div className={styles.collectionTracksContainer}>
          {!tracksLoading ? (
            isEmpty ? (
              <>
                <div className={styles.divider}></div>
                <EmptyTrackList
                  isAlbum={isAlbum}
                  customEmptyText={customEmptyText}
                />
              </>
            ) : (
              <TrackList
                containerClassName={''}
                itemClassName={''}
                tracks={trackList}
                showDivider
                togglePlay={togglePlay}
              />
            )
          ) : null}
          {collectionLoading ? (
            <LoadingSpinner className={styles.spinner} />
          ) : null}
        </div>
      </div>
    </MobilePageContainer>
  )
}

export default memo(CollectionPage)
