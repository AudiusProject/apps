import { useCallback, useEffect, useMemo } from 'react'

import {
  useCollection,
  useCollectionTracks,
  useTracks
} from '@audius/common/api'
import { useCurrentTrack, useGatedContentAccessMap } from '@audius/common/hooks'
import {
  Name,
  PlaybackSource,
  Status,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import type { ID, UID, AccessConditions } from '@audius/common/models'
import {
  collectionPageLineupActions as tracksActions,
  collectionPageSelectors,
  reachabilitySelectors,
  playerSelectors,
  PurchaseableContentType,
  queueActions,
  collectionPageActions
} from '@audius/common/store'
import { formatReleaseDate, Uid } from '@audius/common/utils'
import type { Maybe, Nullable } from '@audius/common/utils'
import dayjs from 'dayjs'
import { pick, uniq } from 'lodash'
import { TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { usePrevious } from 'react-use'
import { createSelector } from 'reselect'

import {
  Box,
  Button,
  Divider,
  Flex,
  IconCalendarMonth,
  IconPause,
  IconPlay,
  IconVisibilityHidden,
  MusicBadge,
  Paper,
  Text
} from '@audius/harmony-native'
import { CollectionDogEar } from 'app/components/collection/CollectionDogEar'
import { UserGeneratedText } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { CollectionMetadataList } from 'app/components/details-tile/CollectionMetadataList'
import { DetailsTileActionButtons } from 'app/components/details-tile/DetailsTileActionButtons'
import { DetailsTileHasAccess } from 'app/components/details-tile/DetailsTileHasAccess'
import { DetailsTileNoAccess } from 'app/components/details-tile/DetailsTileNoAccess'
import { DetailsTileStats } from 'app/components/details-tile/DetailsTileStats'
import type { DetailsTileProps } from 'app/components/details-tile/types'
import { OfflineStatusRow } from 'app/components/offline-downloads'
import { TrackList } from 'app/components/track-list'
import { UserBadges } from 'app/components/user-badges'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'
import { make, track } from 'app/services/analytics'
import type { AppState } from 'app/store'
import { makeStyles } from 'app/styles'

import { CollectionScreenSkeleton } from './CollectionScreenSkeleton'
import { useFetchCollectionLineup } from './useFetchCollectionLineup'

const { getPlaying, getPreviewing, getUid } = playerSelectors
const { getIsReachable } = reachabilitySelectors
const { getCollectionTracksLineup } = collectionPageSelectors
const { resetCollection, fetchCollection } = collectionPageActions

const selectTrackUids = createSelector(
  (state: AppState) => getCollectionTracksLineup(state).entries,
  (entries) => entries.map(({ uid }) => uid)
)

const selectFirstTrack = (state: AppState) =>
  getCollectionTracksLineup(state).entries[0]

const selectTrackCount = (state: AppState) => {
  return getCollectionTracksLineup(state).entries.length
}

const selectIsLineupLoading = (state: AppState) => {
  return getCollectionTracksLineup(state).status !== Status.SUCCESS
}

const selectIsQueued = createSelector(
  selectTrackUids,
  getUid,
  (trackUids, playingUid) => {
    return trackUids.some((trackUid) => playingUid === trackUid)
  }
)

const useRefetchLineupOnTrackAdd = (collectionId: ID) => {
  const { data: collectionTrackCount } = useCollection(collectionId, {
    select: (collection) => collection.playlist_contents.track_ids.length
  })

  const trackCount = collectionId ? collectionTrackCount : 0

  const previousTrackCount = usePrevious(trackCount)
  const dispatch = useDispatch()

  useEffect(() => {
    if (previousTrackCount && previousTrackCount !== trackCount) {
      dispatch(tracksActions.fetchLineupMetadatas(0, 200, false))
    }
  }, [previousTrackCount, trackCount, dispatch])
}

const getMessages = (
  collectionType: 'album' | 'playlist',
  isPremium = false
) => ({
  empty: `This ${collectionType} is empty. Start adding tracks to share it or make it public.`,
  emptyPublic: `This ${collectionType} is empty`,
  detailsPlaceholder: '---',
  collectionType: `${isPremium ? 'premium ' : ''}${collectionType}`,
  play: 'Play',
  pause: 'Pause',
  resume: 'Resume',
  replay: 'Replay',
  preview: 'Preview',
  hidden: 'Hidden',
  releases: (releaseDate: string) =>
    `Releases ${formatReleaseDate({ date: releaseDate, withHour: true })}`
})

const useStyles = makeStyles(({ palette, spacing }) => ({
  empty: {
    color: palette.neutral,
    paddingHorizontal: spacing(8),
    marginBottom: spacing(8),
    textAlign: 'center',
    lineHeight: 20
  },
  coverArt: {
    borderWidth: 1,
    borderColor: palette.neutralLight8,
    borderRadius: spacing(2),
    height: 224,
    width: 224,
    alignSelf: 'center'
  }
}))

type CollectionScreenDetailsTileProps = {
  isAlbum?: boolean
  isOwner?: boolean
  isPublishing?: boolean
  isDeleted?: boolean
  collectionId: number
  hasStreamAccess?: boolean
  streamConditions?: Nullable<AccessConditions>
} & Omit<
  DetailsTileProps,
  | 'descriptionLinkPressSource'
  | 'details'
  | 'headerText'
  | 'onPressPlay'
  | 'onPressPreview'
  | 'collectionId'
  | 'contentType'
>

const recordPlay = (id: Maybe<number>, play = true) => {
  track(
    make({
      eventName: play ? Name.PLAYBACK_PLAY : Name.PLAYBACK_PAUSE,
      id: String(id),
      source: PlaybackSource.PLAYLIST_PAGE
    })
  )
}

const recordPlaylistPlay = ({
  collectionId,
  isAlbum,
  trackCount,
  isPreview
}: {
  collectionId: Maybe<number>
  isAlbum: boolean
  trackCount: number
  isPreview?: boolean
}) => {
  if (collectionId == null) return
  track(
    make({
      eventName: Name.PLAYLIST_PLAY,
      id: String(collectionId),
      source: PlaybackSource.PLAYLIST_PAGE,
      isAlbum,
      trackCount,
      isPreview
    })
  )
}

export const CollectionScreenDetailsTile = ({
  description,
  collectionId,
  isAlbum,
  isPublishing,
  renderImage,
  trackCount: trackCountProp,
  isOwner = false,
  hideOverflow,
  hideActions,
  hasStreamAccess,
  streamConditions,
  ddexApp,
  playCount,
  hidePlayCount,
  hideFavoriteCount,
  hideRepostCount,
  repostCount,
  saveCount,
  hasSaved,
  title,
  hasReposted,
  onPressEdit,
  onPressFavorites,
  onPressOverflow,
  onPressPublish,
  onPressRepost,
  onPressReposts,
  onPressSave,
  onPressShare,
  user,
  releaseDate
}: CollectionScreenDetailsTileProps) => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const navigation = useNavigation()

  const isReachable = useSelector(getIsReachable)

  // Since we're supporting SmartCollections, need to explicitly check that
  // collectionId is a number before fetching the playlist. -1 is a placeholder,
  // the request should not go out as the hook is disabled in that case.
  const { data: partialCollection } = useCollection(collectionId as number, {
    enabled: typeof collectionId === 'number',
    select: (collection) =>
      pick(collection, [
        'is_stream_gated',
        'is_scheduled_release',
        'is_private'
      ])
  })
  const {
    is_stream_gated: isStreamGated,
    is_scheduled_release: isScheduledRelease,
    is_private: isPrivate
  } = partialCollection ?? {}

  const numericCollectionId =
    typeof collectionId === 'number' ? collectionId : undefined
  const { data: collectionTracks } = useCollectionTracks(numericCollectionId)
  const trackAccessMap = useGatedContentAccessMap(collectionTracks ?? [])
  const doesUserHaveAccessToAnyTrack = Object.values(trackAccessMap).some(
    ({ hasStreamAccess }) => hasStreamAccess
  )
  const trackUids = useSelector(selectTrackUids)
  const collectionTrackCount = useSelector(selectTrackCount)
  const trackCount = trackCountProp ?? collectionTrackCount
  const isLineupLoading = useSelector(selectIsLineupLoading)
  const isQueued = useSelector(selectIsQueued)
  const isPlaybackActive = useSelector(getPlaying)
  const isPlaying = isPlaybackActive && isQueued
  const isPreviewing = useSelector(getPreviewing)
  const isPlayingPreview = isPreviewing && isPlaying
  const playingTrack = useCurrentTrack()
  const playingTrackId = playingTrack?.track_id
  const firstTrack = useSelector(selectFirstTrack)
  const messages = getMessages(isAlbum ? 'album' : 'playlist', isStreamGated)
  const isPublished = !isPrivate || isPublishing
  const shouldShowScheduledRelease =
    isScheduledRelease &&
    isPrivate &&
    releaseDate &&
    dayjs(releaseDate).isAfter(dayjs())
  const shouldHideOverflow =
    hideOverflow || !isReachable || (isPrivate && !isOwner)
  const shouldHideActions =
    hideActions || (isPrivate && !isOwner) || !hasStreamAccess
  const shouldeHideShare = hideActions || (isPrivate && !isOwner)
  const isUSDCPurchaseGated = isContentUSDCPurchaseGated(streamConditions)

  const uids = isLineupLoading ? Array(Math.min(5, trackCount ?? 0)) : trackUids
  const trackIds = useMemo(
    () => uniq(uids.map((uid) => Uid.fromString(uid)?.id as ID)),
    [uids]
  )
  const { data: tracks = [] } = useTracks(trackIds)
  const areAllTracksDeleted = tracks.every((track) => track.is_delete)
  const isPlayable =
    tracks.length === 0
      ? true
      : !areAllTracksDeleted && (isQueued || (trackCount > 0 && !!firstTrack))

  const shouldShowPlay =
    !numericCollectionId ||
    (isPlayable && hasStreamAccess) ||
    doesUserHaveAccessToAnyTrack
  const shouldShowPreview =
    isUSDCPurchaseGated && !hasStreamAccess && !shouldShowPlay

  useEffect(() => {
    dispatch(resetCollection())
  }, [dispatch])

  useRefetchLineupOnTrackAdd(collectionId)

  const badges = [
    shouldShowScheduledRelease ? (
      <MusicBadge variant='accent' icon={IconCalendarMonth}>
        {messages.releases(releaseDate)}
      </MusicBadge>
    ) : isPrivate ? (
      <MusicBadge icon={IconVisibilityHidden}>{messages.hidden}</MusicBadge>
    ) : null
  ].filter((badge) => badge !== null)

  const imageElement = renderImage({
    style: styles.coverArt
  })

  const play = useCallback(
    ({ isPreview = false }: { isPreview?: boolean } = {}) => {
      if (isPlaying && isQueued && isPreviewing === isPreview) {
        dispatch(tracksActions.pause())
        recordPlay(playingTrackId, false)
      } else if (!isPlaying && isQueued) {
        dispatch(tracksActions.play())
        recordPlay(playingTrackId)
        recordPlaylistPlay({
          collectionId: numericCollectionId,
          isAlbum: !!isAlbum,
          trackCount,
          isPreview
        })
      } else if (trackCount > 0 && firstTrack) {
        dispatch(queueActions.clear({}))
        dispatch(tracksActions.play(firstTrack.uid, { isPreview }))
        recordPlay(firstTrack.id)
        recordPlaylistPlay({
          collectionId: numericCollectionId,
          isAlbum: !!isAlbum,
          trackCount,
          isPreview
        })
      }
    },
    [
      isPlaying,
      isQueued,
      isPreviewing,
      trackCount,
      firstTrack,
      dispatch,
      playingTrackId,
      numericCollectionId,
      isAlbum
    ]
  )

  const handlePressPlay = useCallback(() => play(), [play])
  const handlePressPreview = useCallback(
    () => play({ isPreview: true }),
    [play]
  )

  const handlePressArtistName = useCallback(() => {
    if (!user) {
      return
    }
    navigation.push('Profile', { handle: user.handle })
  }, [navigation, user])

  const PreviewButton = () => (
    <Button
      variant='tertiary'
      iconLeft={isPlayingPreview ? IconPause : IconPlay}
      onPress={handlePressPreview}
      disabled={!isPlayable}
      fullWidth
    >
      {isPlayingPreview ? messages.pause : messages.preview}
    </Button>
  )

  return (
    <Paper mb='2xl' style={{ overflow: 'hidden' }}>
      <ScreenPrimaryContent skeleton={<CollectionScreenSkeleton />}>
        {numericCollectionId ? (
          <CollectionDogEar collectionId={numericCollectionId} />
        ) : null}
        <Flex p='l' gap='l' alignItems='center' w='100%'>
          <Text
            variant='label'
            size='m'
            strength='default'
            textTransform='uppercase'
            color='subdued'
          >
            {messages.collectionType}
          </Text>

          {badges.length > 0 ? (
            <Flex direction='row' gap='s'>
              {badges.map((badge) => badge)}
            </Flex>
          ) : null}
          {imageElement}
          <Flex gap='xs' alignItems='center'>
            <Text variant='heading' size='s' textAlign='center'>
              {title}
            </Text>
            {user ? (
              <TouchableOpacity onPress={handlePressArtistName}>
                <Flex row gap='xs'>
                  <Text variant='body' color='accent' size='l'>
                    {user.name}
                  </Text>
                  <UserBadges userId={user.user_id} badgeSize='s' />
                </Flex>
              </TouchableOpacity>
            ) : null}
          </Flex>
          {shouldShowPlay ? (
            <Button
              iconLeft={isPlaying ? IconPause : IconPlay}
              onPress={handlePressPlay}
              disabled={!isPlayable}
              fullWidth
            >
              {isPlaying ? messages.pause : messages.play}
            </Button>
          ) : null}
          {shouldShowPreview ? <PreviewButton /> : null}
          <DetailsTileActionButtons
            ddexApp={ddexApp}
            hasReposted={!!hasReposted}
            hasSaved={!!hasSaved}
            hideFavorite={shouldHideActions}
            hideOverflow={shouldHideOverflow}
            hideRepost={shouldHideActions}
            hideShare={shouldeHideShare}
            isOwner={isOwner}
            isCollection
            collectionId={numericCollectionId}
            isPublished={isPublished}
            onPressEdit={onPressEdit}
            onPressOverflow={onPressOverflow}
            onPressRepost={onPressRepost}
            onPressSave={onPressSave}
            onPressShare={onPressShare}
            onPressPublish={onPressPublish}
          />
        </Flex>
        <Flex
          p='l'
          gap='l'
          alignItems='center'
          borderTop='default'
          backgroundColor='surface1'
          borderBottomLeftRadius='m'
          borderBottomRightRadius='m'
        >
          <ScreenSecondaryContent>
            {!hasStreamAccess &&
            !isOwner &&
            streamConditions &&
            numericCollectionId ? (
              <DetailsTileNoAccess
                trackId={numericCollectionId}
                contentType={PurchaseableContentType.ALBUM}
                streamConditions={streamConditions}
              />
            ) : null}
            {(hasStreamAccess || isOwner) && streamConditions ? (
              <DetailsTileHasAccess
                streamConditions={streamConditions}
                isOwner={isOwner}
                trackArtist={user}
                contentType={PurchaseableContentType.ALBUM}
              />
            ) : null}
          </ScreenSecondaryContent>
          {isPublished && numericCollectionId ? (
            <DetailsTileStats
              playCount={playCount}
              hidePlayCount={hidePlayCount}
              favoriteCount={saveCount}
              hideFavoriteCount={hideFavoriteCount}
              repostCount={repostCount}
              hideRepostCount={hideRepostCount}
              onPressFavorites={onPressFavorites}
              onPressReposts={onPressReposts}
            />
          ) : null}
          {description ? (
            <Box w='100%'>
              <UserGeneratedText
                source={'collection page'}
                variant='body'
                size='s'
              >
                {description}
              </UserGeneratedText>
            </Box>
          ) : null}
          {numericCollectionId ? (
            <CollectionMetadataList collectionId={numericCollectionId} />
          ) : null}
          <ScreenSecondaryContent>
            <OfflineStatusRow contentId={numericCollectionId} isCollection />
          </ScreenSecondaryContent>
        </Flex>
      </ScreenPrimaryContent>
      <ScreenSecondaryContent>
        <Divider />
        <CollectionTrackList
          isAlbum={isAlbum}
          isOwner={isOwner}
          isPlaying={isPlaying}
          collectionId={collectionId}
          isLineupLoading={isLineupLoading}
          uids={uids}
        />
      </ScreenSecondaryContent>
    </Paper>
  )
}

type CollectionTrackListProps = Pick<
  CollectionScreenDetailsTileProps,
  'isAlbum' | 'isOwner' | 'isPlaying' | 'collectionId'
> & {
  isLineupLoading: boolean
  uids: UID[]
}

const CollectionTrackList = ({
  isAlbum,
  isOwner,
  collectionId,
  isLineupLoading,
  isPlaying,
  uids
}: CollectionTrackListProps) => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const playingUid = useSelector(getUid)
  const messages = getMessages(isAlbum ? 'album' : 'playlist')

  const numericCollectionId =
    typeof collectionId === 'number' ? collectionId : undefined

  const { params } = useRoute<'Collection'>()
  const { slug, collectionType, handle } = params ?? {}
  const permalink = slug ? `/${handle}/${collectionType}/${slug}` : undefined

  const handleFetchCollection = useCallback(() => {
    dispatch(resetCollection())
    if (numericCollectionId) {
      dispatch(fetchCollection(collectionId as number, permalink, true))
    }
  }, [dispatch, collectionId, permalink, numericCollectionId])

  useFetchCollectionLineup(collectionId, handleFetchCollection)

  const handlePressTrackListItemPlay = useCallback(
    (uid: UID, id: ID) => {
      if (isPlaying && playingUid === uid) {
        dispatch(tracksActions.pause())
        recordPlay(id, false)
      } else if (playingUid !== uid) {
        dispatch(tracksActions.play(uid))
        recordPlay(id)
      } else {
        dispatch(tracksActions.play())
        recordPlay(id)
      }
    },
    [dispatch, isPlaying, playingUid]
  )
  return (
    <TrackList
      contextPlaylistId={!isAlbum ? numericCollectionId : undefined}
      trackItemAction='overflow'
      showSkeleton={isLineupLoading}
      togglePlay={handlePressTrackListItemPlay}
      isAlbumPage={isAlbum}
      uids={uids}
      ListEmptyComponent={
        isLineupLoading ? null : (
          <Box mt='m'>
            <Text variant='body' style={styles.empty}>
              {isOwner ? messages.empty : messages.emptyPublic}
            </Text>
          </Box>
        )
      }
    />
  )
}
