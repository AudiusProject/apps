import {
  queryCollection,
  queryCurrentUserId,
  queryTrack,
  queryTrackByUid,
  queryUser
} from '@audius/common/api'
import {
  Kind,
  ID,
  Name,
  PlaybackSource,
  LineupState,
  Track,
  Collection,
  UserTrackMetadata,
  LineupEntry
} from '@audius/common/models'
import {
  cacheActions,
  lineupRegistry,
  queueActions,
  queueSelectors,
  reachabilitySelectors,
  RepeatMode,
  QueueSource,
  getContext,
  playerActions,
  playerSelectors,
  PlayerBehavior,
  profilePageSelectors
} from '@audius/common/store'
import { Uid, makeUid, waitForAccount, Nullable } from '@audius/common/utils'
import { all, call, put, select, takeEvery, takeLatest } from 'typed-redux-saga'
import { PREFIX as REMIXES_PREFIX } from '~/store/pages/remixes/lineup/actions'
import { PREFIX as SEARCH_PREFIX } from '~/store/pages/search-results/lineup/tracks/actions'
import { PREFIX as TRACK_PAGE_LINEUP_PREFIX } from '~/store/pages/track/lineup/actions'

import { make } from 'common/store/analytics/actions'
import { getRecommendedTracks } from 'common/store/recommendation/sagas'
import { getLocation } from 'store/routing/selectors'

const {
  getId: getQueueTrackId,
  getIndex,
  getLength,
  getOvershot,
  getRepeat,
  getShuffle,
  getSource,
  getUid,
  getUndershot
} = queueSelectors

const { getProfileUserHandle } = profilePageSelectors

const {
  getTrackId: getPlayerTrackId,
  getUid: getPlayerUid,
  getPlayerBehavior
} = playerSelectors

const { add, clear, next, pause, play, queueAutoplay, previous } = queueActions
const { getIsReachable } = reachabilitySelectors

const QUEUE_SUBSCRIBER_NAME = 'QUEUE'

const TAN_QUERY_LINEUP_PREFIXES = [
  SEARCH_PREFIX,
  REMIXES_PREFIX,
  TRACK_PAGE_LINEUP_PREFIX
]
export function* getToQueue(
  prefix: string,
  entry: LineupEntry<Track | Collection>
) {
  if (entry.kind === Kind.COLLECTIONS) {
    const collection = yield* call(queryCollection, entry.id)
    if (!collection) return

    const {
      playlist_contents: { track_ids: trackIds }
    } = collection
    // Replace the track uid source w/ the full source including collection source
    // Replace the track count w/ it's index in the array
    const collectionUid = Uid.fromString(entry.uid)
    const collectionSource = collectionUid.source

    return trackIds.map(({ track, uid }, idx: number) => {
      const trackUid = Uid.fromString(uid ?? '')
      trackUid.source = `${collectionSource}:${trackUid.source}`
      trackUid.count = idx

      return {
        id: track,
        uid: trackUid.toString(),
        source: prefix
      }
    })
  } else if (entry.kind === Kind.TRACKS) {
    const track = yield* queryTrackByUid(entry.uid)
    if (!track) return {}
    return {
      id: track.track_id,
      uid: entry.uid,
      source: prefix,
      playerBehavior: PlayerBehavior.FULL_OR_PREVIEW
    }
  }
}

const flatten = (list: any[]): any[] =>
  list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), [])

function* handleQueueAutoplay({
  skip,
  ignoreSkip,
  track
}: {
  skip: boolean
  ignoreSkip: boolean
  track: any
}) {
  const index = yield* select(getIndex)
  if (index < 0) {
    return
  }

  // Get recommended tracks if not in shuffle mode
  // and not in repeat mode and
  // - close to end of queue, or
  // - playing first song of lineup and lineup has only one song
  const length = yield* select(getLength)
  const shuffle = yield* select(getShuffle)
  const repeatMode = yield* select(getRepeat)
  const source = yield* select(getSource)
  const trackPageException = source === QueueSource.TRACK_TRACKS && length === 1

  const isCloseToEndOfQueue = index + 2 >= length
  const isNotRepeating =
    repeatMode === RepeatMode.OFF ||
    (repeatMode === RepeatMode.SINGLE && (skip || ignoreSkip))

  if (
    !shuffle &&
    isNotRepeating &&
    isCloseToEndOfQueue &&
    !trackPageException
  ) {
    yield* waitForAccount()
    const userId = yield* call(queryCurrentUserId)
    yield* put(
      queueAutoplay({
        genre: track?.genre,
        exclusionList: track ? [track.track_id] : [],
        currentUserId: userId
      })
    )
  }
}

/**
 * Play the queue. The side effects are slightly complicated, but can be summarized in the following
 * cases.
 * 1. If the caller provided a uid, play that uid.
 * 2. If no uid was provided and the queue is empty, find whatever lineup is on the page, queue it and play it.
 * 3. If the queue is indexed onto a different uid than the player, play the queue's uid
 * 4. Resume whatever was playing on the player
 */
function* watchPlay() {
  yield* takeLatest(play.type, function* (action: ReturnType<typeof play>) {
    const { uid, trackId, playerBehavior } = action.payload

    // Play a specific uid
    const playerUid = yield* select(getPlayerUid)
    const playerTrackId = yield* select(getPlayerTrackId)
    const playerPlayerBehavior = yield* select(getPlayerBehavior)

    if (uid || trackId) {
      let playActionTrack
      if (trackId) {
        playActionTrack = yield* queryTrack(trackId)
      } else if (uid) {
        playActionTrack = yield* queryTrackByUid(uid)
      }

      if (!playActionTrack) return

      const length = yield* select(getLength)
      const index = yield* select(getIndex)
      const isNearEndOfQueue = index + 3 >= length

      if (isNearEndOfQueue) {
        /* Fetch more lineup tracks if available. Ideally, this would run async after we've started
        playing the next track. But since we may skip the next track, we need the lineup and/or autoplay
        logic to be run ahead of time.
        Important note: Using the track we're being asked to play, as the lineup
        source may be changing with that track, and we don't want to look up a lineup
        using the "currentTrack" in the player.
        */
        yield* call(fetchLineupTracks, playActionTrack)
      }

      yield* call(handleQueueAutoplay, {
        skip: false,
        ignoreSkip: true,
        track: playActionTrack
      })

      const user = playActionTrack
        ? yield* queryUser(playActionTrack.owner_id)
        : null

      // Skip deleted tracks
      if (
        (playActionTrack && playActionTrack.is_delete) ||
        // @ts-ignore user incorrectly typed as `null`. ignoring until we implement typed-redux-saga
        user?.is_deactivated
      ) {
        yield* put(next({}))
        return
      }

      // Make sure that we should actually play
      const noTrackPlaying = !playerTrackId
      const trackIsDifferent = playerTrackId !== playActionTrack.track_id
      const trackIsSameButDifferentUid =
        playerTrackId === playActionTrack.track_id && uid !== playerUid
      const trackIsSameButDifferentPlayerBehavior =
        playerTrackId === playActionTrack.track_id &&
        playerPlayerBehavior !== playerBehavior
      if (
        noTrackPlaying ||
        trackIsDifferent ||
        trackIsSameButDifferentUid ||
        trackIsSameButDifferentPlayerBehavior
      ) {
        yield* put(
          playerActions.play({
            uid,
            trackId: playActionTrack.track_id,
            onEnd: next,
            playerBehavior
          })
        )
      } else {
        yield* put(playerActions.play({}))
      }
    } else {
      // If nothing is queued, grab the proper lineup, queue it and play it
      const index = yield* select(getIndex)
      if (index === -1) {
        const getLineupSelectorForRoute = yield* getContext(
          'getLineupSelectorForRoute'
        )
        if (!getLineupSelectorForRoute) return

        const location = yield* select(getLocation)

        if (!location) return
        const lineup: LineupState<Track> = yield* select(
          getLineupSelectorForRoute(location)
        )
        if (!lineup) return
        if (lineup.entries.length > 0) {
          yield* put(clear({}))
          const toQueue = yield* all(
            lineup.entries.map((e) => call(getToQueue, lineup.prefix, e))
          )
          const flattenedQueue = flatten(toQueue)
          yield* put(add({ entries: flattenedQueue }))

          const playTrack = yield* queryTrackByUid(flattenedQueue[0].uid)

          if (!playTrack) return

          yield* put(
            play({
              uid: flattenedQueue[0].uid,
              trackId: playTrack.track_id,
              source: lineup.prefix
            })
          )
        }
      } else {
        const queueUid = yield* select(getPlayerUid)
        const playerTrackId = yield* select(getPlayerTrackId)
        if (queueUid && playerTrackId && queueUid !== playerUid) {
          yield* put(
            playerActions.play({ uid: queueUid, trackId: playerTrackId })
          )
        } else {
          // Play whatever is/was playing
          yield* put(playerActions.play({}))
        }
      }
    }
  })
}

// Fetches more lineup tracks if available. This is needed for cases
// where the user hasn't scrolled through the lineup.
function* fetchLineupTracks(currentTrack: Track) {
  const source = yield* select(getSource)
  if (!source) return

  const lineupEntry = lineupRegistry[source]
  if (!lineupEntry) return

  // NOTE: For tan-query lineups we want to avoid this behavior
  if (TAN_QUERY_LINEUP_PREFIXES.includes(lineupEntry.actions.prefix)) return

  const currentProfileUserHandle = yield* select(getProfileUserHandle)

  const currentTrackOwner = yield* queryUser(currentTrack.owner_id)

  // NOTE: This is a bandaid fix. On the profile page when on the reposts lineup,
  // we need to select the lineup using the handle of the profile page user, not the handle of the track owner
  const handleToUse =
    source === QueueSource.PROFILE_FEED
      ? (currentProfileUserHandle ?? undefined)
      : currentTrackOwner?.handle

  const lineup = yield* select(lineupEntry.selector, handleToUse)

  if (lineup.hasMore) {
    const offset = lineup.entries.length + lineup.deleted + lineup.nullCount
    yield* put(
      lineupEntry.actions.fetchLineupMetadatas(
        offset,
        5,
        false,
        lineup.payload,
        { handle: lineup.handle }
      )
    )
  }
}

function* watchPause() {
  yield* takeEvery(pause.type, function* (action: ReturnType<typeof pause>) {
    yield* put(playerActions.pause({}))
  })
}

function* watchNext() {
  yield* takeEvery(next.type, function* (action: ReturnType<typeof next>) {
    const skip = action.payload?.skip

    // If the queue has overshot the end, reset the song
    const overshot = yield* select(getOvershot)
    if (overshot) {
      yield* put(playerActions.reset({ shouldAutoplay: false }))
      return
    }

    const id = (yield* select(getQueueTrackId)) as ID
    const playerBehavior = (yield* select(getPlayerBehavior) || undefined) as
      | PlayerBehavior
      | undefined
    const track = yield* queryTrack(id)
    const user = yield* queryUser(track?.owner_id)
    const doesUserHaveStreamAccess =
      !track?.is_stream_gated || !!track?.access?.stream

    // Skip deleted, owner deactivated, or locked gated track
    if (
      track &&
      (track.is_delete ||
        user?.is_deactivated ||
        (!doesUserHaveStreamAccess && !track.preview_cid))
    ) {
      yield* put(next({ skip }))
    } else {
      const uid = yield* select(getUid)
      const source = yield* select(getSource)

      yield* call(handleQueueAutoplay, {
        skip: !!skip,
        ignoreSkip: false,
        track
      })

      if (track) {
        const repeatMode = yield* select(getRepeat)
        const trackIsSameAndRepeatSingle = repeatMode === RepeatMode.SINGLE

        if (trackIsSameAndRepeatSingle) {
          yield* put(
            playerActions.play({
              uid,
              trackId: track.track_id,
              onEnd: next,
              playerBehavior
            })
          )
        } else {
          yield* put(
            play({
              uid,
              trackId: id,
              source,
              playerBehavior
            })
          )
          const event = make(Name.PLAYBACK_PLAY, {
            id: `${id}`,
            source: PlaybackSource.PASSIVE
          })
          yield* put(event)
        }
      } else {
        yield* put(playerActions.stop({}))
      }
    }
  })
}

function* watchQueueAutoplay() {
  yield* takeEvery(
    queueAutoplay.type,
    function* (action: ReturnType<typeof queueAutoplay>) {
      const { genre, exclusionList, currentUserId } = action.payload
      const isReachable = yield* select(getIsReachable)
      if (!isReachable) return
      const tracks: UserTrackMetadata[] = yield* call(
        getRecommendedTracks,
        genre,
        exclusionList,
        currentUserId
      )
      const recommendedTracks = tracks.map(({ track_id }) => ({
        id: track_id,
        uid: makeUid(Kind.TRACKS, track_id),
        source: QueueSource.RECOMMENDED_TRACKS
      }))
      yield* put(add({ entries: recommendedTracks }))
    }
  )
}

function* watchPrevious() {
  yield* takeEvery(
    previous.type,
    function* (action: ReturnType<typeof previous>) {
      // If the queue has undershot the beginning, reset the song
      const undershot = yield* select(getUndershot)
      if (undershot) {
        yield* put(playerActions.reset({ shouldAutoplay: false }))
        return
      }

      const uid = yield* select(getUid)
      const id = (yield* select(getQueueTrackId)) as Nullable<ID>
      const playerBehavior = (yield* select(getPlayerBehavior) || undefined) as
        | PlayerBehavior
        | undefined
      const track = yield* queryTrack(id)
      const source = yield* select(getSource)
      const user = yield* queryUser(track?.owner_id)
      const doesUserHaveStreamAccess =
        !track?.is_stream_gated || !!track?.access?.stream

      // If we move to a previous song that's been
      // deleted or to which the user does not have access, skip over it.
      if (
        track &&
        (track.is_delete ||
          user?.is_deactivated ||
          (!doesUserHaveStreamAccess && !track.preview_cid))
      ) {
        yield* put(previous())
      } else {
        const index = yield* select(getIndex)
        if (track && index >= 0) {
          yield* put(
            play({
              uid,
              trackId: id,
              source,
              playerBehavior
            })
          )
          const event = make(Name.PLAYBACK_PLAY, {
            id: `${id}`,
            source: PlaybackSource.PASSIVE
          })
          yield* put(event)
        } else {
          yield* put(playerActions.stop({}))
        }
      }
    }
  )
}

function* watchAdd() {
  yield* takeEvery(add.type, function* (action: ReturnType<typeof add>) {
    const { entries } = action.payload

    const subscribers = entries.map((entry) => ({
      uid: QUEUE_SUBSCRIBER_NAME,
      id: entry.id
    }))
    yield* put(cacheActions.subscribe(Kind.TRACKS, subscribers))
  })
}

const sagas = () => {
  const sagas = [
    watchPlay,
    watchPause,
    watchNext,
    watchQueueAutoplay,
    watchPrevious,
    watchAdd
  ]
  return sagas
}

export default sagas
