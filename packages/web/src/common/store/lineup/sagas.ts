import {
  queryAllTracks,
  queryAllCachedUsers,
  queryTrackByUid,
  updateCollectionData,
  queryCurrentUserId
} from '@audius/common/api'
import {
  Name,
  Kind,
  isContentUSDCPurchaseGated,
  LineupEntry,
  Track,
  Collection,
  UID,
  LineupState,
  CollectionMetadata
} from '@audius/common/models'
import { StringKeys, FeatureFlags } from '@audius/common/services'
import {
  cacheActions,
  lineupActions as baseLineupActions,
  premiumTracksPageLineupActions,
  queueActions,
  queueSelectors,
  getContext,
  playerSelectors,
  SubscriberInfo,
  Entry,
  LineupBaseActions,
  QueueSource,
  PlayerBehavior
} from '@audius/common/store'
import { Uid, makeUids, makeUid, removeNullable } from '@audius/common/utils'
import {
  all,
  call,
  put,
  fork,
  select,
  take,
  takeEvery,
  takeLatest,
  race
} from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'
import { getToQueue } from 'common/store/queue/sagas'
import { isPreview } from 'common/utils/isPreview'
import { AppState } from 'store/types'
const { getSource, getUid, getPositions, getPlayerBehavior } = queueSelectors
const { getUid: getCurrentPlayerTrackUid, getPlaying } = playerSelectors

const getEntryId = <T>(entry: LineupEntry<T>) => `${entry.kind}:${entry.id}`

const flatten = (list: any[]): any[] =>
  list.reduce((a, b) => a.concat(Array.isArray(b) ? flatten(b) : b), [])

function* filterDeletes<T extends Track | Collection>(
  tracksMetadata: LineupEntry<T>[],
  removeDeleted: boolean,
  lineupPrefix: string
) {
  const tracks = yield* queryAllTracks()
  const users = yield* queryAllCachedUsers()
  const remoteConfig = yield* getContext('remoteConfigInstance')
  const getFeatureEnabled = yield* getContext('getFeatureEnabled')
  yield* call(remoteConfig.waitForRemoteConfig)

  const isUSDCGatedContentEnabled = yield* call(
    getFeatureEnabled,
    FeatureFlags.USDC_PURCHASES
  )
  const deniedHandles = remoteConfig
    .getRemoteVar(StringKeys.EXPLORE_PREMIUM_DENIED_USERS)
    ?.split(',')

  // TODO: are we properly filtering out deleted collections?
  return tracksMetadata
    .map((metadata) => {
      // If the incoming metadata is null, return null
      // This will be accounted for in `nullCount`
      if (metadata === null) {
        return null
      }

      // Treat usdc content as deleted if feature is not enabled
      // TODO: https://linear.app/audius/issue/PAY-1533/remove-usdc-feature-flag
      // Remove this when removing the feature flags
      if (
        !isUSDCGatedContentEnabled &&
        metadata.is_stream_gated &&
        isContentUSDCPurchaseGated(metadata.stream_conditions)
      ) {
        return null
      }

      // Filter out known test accounts from premium explore page.
      if (
        lineupPrefix === premiumTracksPageLineupActions.prefix &&
        'track_id' in metadata &&
        metadata.is_stream_gated &&
        isContentUSDCPurchaseGated(metadata.stream_conditions) &&
        deniedHandles?.includes(users[metadata.owner_id].handle)
      ) {
        return null
      }

      const trackId = 'track_id' in metadata ? metadata.track_id : null
      const ownerId =
        'owner_id' in metadata ? metadata.owner_id : metadata.playlist_owner_id
      // If we said to remove deleted tracks and it is deleted, remove it
      if (removeDeleted && metadata.is_delete) return null
      // If we said to remove deleted and the track/playlist owner is deactivated, remove it
      else if (removeDeleted && users[ownerId]?.is_deactivated) return null
      else if (removeDeleted && users[ownerId]?.is_deactivated) return null
      // If the track was not cached, keep it
      else if (trackId && !tracks[trackId]) return metadata
      // If we said to remove deleted and it's marked deleted remove it
      else if (removeDeleted && trackId && tracks[trackId]._marked_deleted)
        return null
      return {
        ...metadata,
        // Maintain the marked deleted
        _marked_deleted: !!(trackId && !!tracks[trackId]._marked_deleted)
      }
    })
    .filter(Boolean)
}

function getTrackCacheables(
  metadata: LineupEntry<Track>,
  uid: UID,
  trackSubscribers: SubscriberInfo[]
) {
  trackSubscribers.push({ uid: metadata.uid || uid, id: metadata.track_id })
}

function getCollectionCacheables(
  metadata: Collection,
  uid: UID,
  collectionsToCache: Entry<CollectionMetadata>[],
  trackSubscribers: SubscriberInfo[]
) {
  collectionsToCache.push({ id: metadata.playlist_id, uid, metadata })

  const trackIds = metadata.playlist_contents.track_ids.map((t) => t.track)
  const trackUids = trackIds.map((id) =>
    makeUid(Kind.TRACKS, id, `collection:${metadata.playlist_id}`)
  )

  metadata.playlist_contents.track_ids =
    metadata.playlist_contents.track_ids.map((t, i) => {
      const trackUid = t.uid || trackUids[i]
      trackSubscribers.push({ uid: trackUid, id: t.track })
      return { uid: trackUid, ...t }
    })
}

function* fetchLineupMetadatasAsync<T extends Track | Collection>(
  lineupActions: LineupBaseActions,
  lineupMetadatasCall: (
    action: ReturnType<LineupBaseActions['fetchLineupMetadatas']>
  ) => Generator<any, T[] | null, any> | Promise<T[] | null>,
  lineupSelector: (state: AppState, handle?: string) => LineupState<T>,
  retainSelector: (entry: LineupEntry<T>) => LineupEntry<T>,
  lineupPrefix: string,
  removeDeleted: boolean,
  sourceSelector:
    | ((state: AppState, handle?: string) => QueueSource | string | null)
    | undefined,
  action: ReturnType<LineupBaseActions['fetchLineupMetadatas']> & {
    handle?: string
  }
) {
  const initLineup = yield* select(lineupSelector)
  const initSource = sourceSelector
    ? yield* select((state) =>
        sourceSelector(state, action.handle?.toLowerCase())
      )
    : initLineup.prefix

  function* fetchLineupMetadatasTask() {
    try {
      yield* put(
        lineupActions.fetchLineupMetadatasRequested(
          action.offset,
          action.limit,
          action.overwrite,
          action.payload,
          action.handle?.toLowerCase()
        )
      )

      const lineupMetadatasResponse: LineupEntry<T>[] = yield* call(
        lineupMetadatasCall,
        action
      ) as unknown as LineupEntry<T>[]

      if (lineupMetadatasResponse === null) {
        yield* put(lineupActions.fetchLineupMetadatasFailed())
      }
      const lineup = yield* select((state) =>
        lineupSelector(state, action.handle?.toLowerCase())
      )
      const source = sourceSelector
        ? yield* select(sourceSelector)
        : lineup.prefix

      const queueUids = Object.keys(yield* select(getPositions)).map((uid) =>
        Uid.fromString(uid)
      )
      // Get every UID in the queue whose source references this lineup
      // in the form of { id: [uid1, uid2] }
      const uidForSource = queueUids
        .filter((uid) => uid.source === source)
        .reduce<{ [id: string]: string[] }>((mapping, uid) => {
          if (uid.id in mapping) {
            mapping[uid.id].push(uid.toString())
          } else {
            mapping[uid.id] = [uid.toString()]
          }
          return mapping
        }, {})

      // Filter out deletes (and premium content if disabled)
      const responseFilteredDeletes = yield* call(
        filterDeletes<T>,
        lineupMetadatasResponse,
        removeDeleted,
        lineupPrefix
      )

      const nullCount = lineupMetadatasResponse.reduce(
        (result, current) => (current === null ? result + 1 : result),
        0
      )

      const allMetadatas = responseFilteredDeletes
        .map((item) => {
          if (!item) return null
          const id = 'track_id' in item ? item.track_id : item.playlist_id
          if (id && uidForSource[id] && uidForSource[id].length > 0) {
            const uid = uidForSource[id].shift()
            if (uid) item.uid = uid
          }
          return item
        })
        .filter(removeNullable)

      const kinds = allMetadatas.map((metadata) =>
        'track_id' in metadata ? Kind.TRACKS : Kind.COLLECTIONS
      )
      const ids = allMetadatas.map((metadata) =>
        'track_id' in metadata ? metadata.track_id : metadata.playlist_id
      )
      const uids = makeUids(kinds, ids, source ?? undefined)

      // Cache tracks and collections.
      const collectionsToCache: Entry<Collection>[] = []

      let trackSubscribers: SubscriberInfo[] = []

      allMetadatas.forEach((metadata, i) => {
        // Need to update the UIDs on the playlist tracks
        if ('track_id' in metadata) {
          getTrackCacheables(
            metadata as LineupEntry<Track>,
            uids[i],
            trackSubscribers
          )
        } else if ('collection_id' in metadata) {
          getCollectionCacheables(
            metadata as LineupEntry<Collection>,
            uids[i],
            collectionsToCache,
            trackSubscribers
          )
        }
      })

      const lineupCollections = allMetadatas.filter(
        (item) => 'playlist_id' in item
      )

      lineupCollections.forEach((metadata) => {
        if (!('playlist_id' in metadata)) return
        const trackUids = metadata.playlist_contents.track_ids.map(
          (track, idx) => {
            const id = track.track
            const uid = new Uid(
              Kind.TRACKS,
              id,
              Uid.makeCollectionSourceId(
                source!,
                metadata.playlist_id.toString()
              ),
              idx
            )
            return { id, uid: uid.toString() }
          }
        )
        trackSubscribers = trackSubscribers.concat(trackUids)
      })

      // We rewrote the playlist tracks with new UIDs, so we need to update them
      // in the cache.
      if (collectionsToCache.length > 0) {
        yield* call(
          updateCollectionData,
          collectionsToCache.map((collection) => collection.metadata)
        )
      }
      if (trackSubscribers.length > 0) {
        yield* put(cacheActions.subscribe(Kind.TRACKS, trackSubscribers))
      }
      const currentUserId = yield* call(queryCurrentUserId)
      // Retain specified info in the lineup itself and resolve with success.
      let duplicateCount = 0
      const lineupEntries = allMetadatas
        .map(retainSelector)
        .map((m, i) => {
          const lineupEntry = allMetadatas[i]
          // Use metadata.uid, entry.uid, computed new uid in that order of precedence
          return {
            ...m,
            uid: m.uid || lineupEntry.uid || uids[i],
            isPreview:
              'track_id' in lineupEntry &&
              isPreview(lineupEntry as Track, currentUserId)
          }
        })
        .filter((metadata, idx) => {
          if (lineup.dedupe && lineup.entryIds) {
            const entryId = getEntryId(metadata)
            if (lineup.entryIds.has(entryId)) {
              duplicateCount += 1
              return false
            }
            lineup.entryIds.add(entryId)
          }
          return true
        })

      const deletedCount =
        lineupMetadatasResponse.length -
        responseFilteredDeletes.length -
        nullCount +
        duplicateCount
      yield* put(
        lineupActions.fetchLineupMetadatasSucceeded(
          lineupEntries,
          action.offset,
          action.limit,
          deletedCount,
          nullCount,
          action.handle?.toLowerCase()
        )
      )

      // Add additional items to the queue if need be.
      yield* fork(
        updateQueueLineup<T>,
        lineupPrefix,
        source as QueueSource,
        lineupEntries
      )
    } catch (err) {
      console.error(err)
      yield* put(lineupActions.fetchLineupMetadatasFailed())
    }
  }

  function* shouldCancelTask() {
    while (true) {
      const { source: resetSource } = yield* take<
        ReturnType<LineupBaseActions['reset']>
      >(baseLineupActions.addPrefix(lineupPrefix, baseLineupActions.RESET))

      // If a source is specified in the reset action, make sure it matches the lineup source
      // If not specified, cancel the fetchTrackMetdatas
      if (!resetSource || resetSource === initSource) {
        return true
      }
    }
  }

  yield* race({
    task: call(fetchLineupMetadatasTask),
    cancel: call(shouldCancelTask)
  })
}

function* updateQueueLineup<T extends Track | Collection>(
  lineupPrefix: string,
  source: QueueSource,
  lineupEntries: LineupEntry<T>[]
) {
  const queueSource = yield* select(getSource)
  const uid = yield* select(getUid)
  const currentUidSource = uid && Uid.fromString(uid).source
  if (
    queueSource === lineupPrefix &&
    (!source || source === currentUidSource)
  ) {
    const toQueue = yield* all(
      lineupEntries.map((e) => call(getToQueue, lineupPrefix, e))
    )
    const flattenedQueue = flatten(toQueue).filter((e) => Boolean(e))
    yield* put(queueActions.add({ entries: flattenedQueue }))
  }
}

function* play<T extends Track | Collection>(
  _lineupActions: LineupBaseActions,
  lineupSelector: (state: AppState, handle?: string) => LineupState<T>,
  prefix: string,
  action: ReturnType<LineupBaseActions['play']>
) {
  const lineup = yield* select(lineupSelector)
  const requestedPlayTrack = yield* queryTrackByUid(action.uid)
  const isPreview = !!action.isPreview

  if (action.uid) {
    const source = yield* select(getSource)
    const currentPlayerTrackUid = yield* select(getCurrentPlayerTrackUid)
    const currentPlayerBehavior = yield* select(getPlayerBehavior)
    const newPlayerBehavior = isPreview
      ? PlayerBehavior.PREVIEW_OR_FULL
      : PlayerBehavior.FULL_OR_PREVIEW
    if (
      !currentPlayerTrackUid ||
      source !== lineup.prefix ||
      currentPlayerBehavior !== newPlayerBehavior
    ) {
      const toQueue = yield* all(
        lineup.entries.map(function* (e: LineupEntry<T>) {
          const queueable = yield* call(getToQueue, lineup.prefix, e)
          // If the entry is the one we're playing, set isPreview to incoming
          // value
          if (isPreview && queueable && 'uid' in queueable) {
            queueable.playerBehavior = PlayerBehavior.PREVIEW_OR_FULL
          }
          return queueable
        })
      )

      const flattenedQueue = flatten(toQueue).filter((e) => Boolean(e))
      yield* put(queueActions.clear({}))
      yield* put(queueActions.add({ entries: flattenedQueue }))
    }
  }
  yield* put(
    queueActions.play({
      uid: action.uid,
      trackId: requestedPlayTrack && requestedPlayTrack.track_id,
      source: prefix,
      playerBehavior: isPreview ? PlayerBehavior.PREVIEW_OR_FULL : undefined
    })
  )
}

function* pause(_action: ReturnType<LineupBaseActions['pause']>) {
  yield* put(queueActions.pause({}))
}

function* togglePlay<T extends Track | Collection>(
  lineupActions: LineupBaseActions,
  _lineupSelector: (state: AppState, handle?: string) => LineupState<T>,
  _prefix: string,
  action: ReturnType<LineupBaseActions['togglePlay']>
) {
  const isPlaying = yield* select(getPlaying)
  const analytics = yield* getContext('analytics')

  const playingUid = yield* select(getCurrentPlayerTrackUid)
  const isPlayingUid = playingUid === action.uid

  if (!isPlayingUid || !isPlaying) {
    yield* put(lineupActions.play(action.uid))
    yield* put(
      make(Name.PLAYBACK_PLAY, {
        id: `${action.id}`,
        source: action.source
      })
    )
  } else {
    yield* put(lineupActions.pause())
    analytics.track({
      eventName: Name.PLAYBACK_PAUSE,
      id: `${action.id}`,
      source: action.source
    })
  }
}

function* reset(lineupActions: LineupBaseActions) {
  yield* put(lineupActions.resetSucceeded())
}

function* add(action: ReturnType<LineupBaseActions['add']>) {
  if (action.entry && action.id) {
    const { kind, uid } = action.entry
    yield* put(cacheActions.subscribe(kind, [{ uid, id: action.id }]))
  }
}

function* updateLineupOrder(
  lineupPrefix: string,
  sourceSelector:
    | ((state: AppState, handle?: string) => QueueSource | string | null)
    | undefined,
  action: ReturnType<LineupBaseActions['updateLineupOrder']>
) {
  // TODO: Investigate a better way to handle reordering of the lineup and transitively
  // reordering the queue. This implementation is slightly buggy in that the source may not
  // be set on the queue item when reordering and the next track won't resume correctly.
  const queueSource = yield* select(getSource)
  const source = sourceSelector
    ? yield* select((state) =>
        sourceSelector(state, action.handle?.toLowerCase())
      )
    : lineupPrefix
  const uid = yield* select(getUid)
  const currentUidSource = uid && Uid.fromString(uid).source
  if (
    queueSource === lineupPrefix &&
    (!source || source === currentUidSource)
  ) {
    yield* put(queueActions.reorder({ orderedUids: action.orderedIds }))
  }
}

function* refreshInView<T extends Track | Collection>(
  lineupActions: LineupBaseActions,
  lineupSelector: (state: AppState, handle?: string) => LineupState<T>,
  action: ReturnType<LineupBaseActions['refreshInView']>
) {
  const lineup = yield* select(lineupSelector)
  const { type: _ignoredType, limit, overwrite, payload, ...other } = action
  yield* put(
    lineupActions.fetchLineupMetadatas(
      0,
      limit || lineup.total,
      overwrite,
      payload,
      other
    )
  )
}

const keepUidAndKind = <T extends Track | Collection>(
  entry: LineupEntry<T>
) => ({
  uid: entry.uid,
  kind: entry.kind ?? ('track_id' in entry ? Kind.TRACKS : Kind.COLLECTIONS),
  id: 'track_id' in entry ? entry.track_id : entry.playlist_id
})

/**
 * A generic class of common Lineup Sagas for fetching, loading and
 * simple playback.
 * @example
 *  // playlist.js
 *  // Creates an exports and array of all sagas to be combined in the
 *  // root saga.
 *  class PlaylistSagas extends LineupSagas {
 *    constructor() {
 *      const selector = store => store.playlist
 *      super("PLAYLIST", playlistActions, selector, Backend.getPlaylist)
 *    }
 *  }
 *  export default function sagas () {
 *    return new PlaylistSagas().getSagas()
 *  }
 */
export class LineupSagas<T extends Track | Collection> {
  prefix: string
  actions: LineupBaseActions
  selector: (state: AppState) => LineupState<T>
  lineupMetadatasCall: (args: {
    limit: number
    offset: number
  }) => Generator<any, T[] | null, any> | Promise<T[] | null>

  retainSelector: (entry: LineupEntry<T>) => LineupEntry<any>
  removeDeleted: boolean
  sourceSelector:
    | ((
        state: AppState,
        handle?: string | undefined
      ) => QueueSource | string | null)
    | undefined

  /**
   * @param {string} prefix the prefix for the lineup, e.g. FEED
   * @param {object} actions the actions class instance for the lineup
   * @param {function} selector the selector for the lineup, e.g. state => state.feed
   * @param {function * | async function} lineupMetadatasCall
   *   the backend call to make to fetch the tracks metadatas for the lineup
   * @param {?function} retainSelector a selector used to retain various metadata inside the lineup state
   *   otherwise, the lineup will only retain the track id indexing into the cache
   * @param {?boolean} removeDeleted whether or not to prune deleted tracks
   * @param {?function} sourceSelector optional selector that sets the UID source for entries
   */
  constructor(
    prefix: string,
    actions: LineupBaseActions,
    selector: (state: AppState) => LineupState<T>,
    lineupMetadatasCall: (args: {
      limit: number
      offset: number
      payload?: any
    }) => Generator<any, T[] | null, any> | Promise<T[] | null>,
    retainSelector: (
      entry: LineupEntry<T>
    ) => LineupEntry<any> = keepUidAndKind,
    removeDeleted: boolean = true,
    sourceSelector?: (
      state: AppState,
      handle?: string | undefined
    ) => QueueSource | string | null
  ) {
    this.prefix = prefix
    this.actions = actions
    this.selector = selector
    this.lineupMetadatasCall = lineupMetadatasCall
    this.retainSelector = retainSelector
    this.removeDeleted = removeDeleted
    this.sourceSelector = sourceSelector
  }

  watchFetchLineupMetadata = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(
          instance.prefix,
          baseLineupActions.FETCH_LINEUP_METADATAS
        ),
        fetchLineupMetadatasAsync<T>,
        instance.actions,
        instance.lineupMetadatasCall,
        instance.selector,
        instance.retainSelector,
        instance.prefix,
        instance.removeDeleted,
        instance.sourceSelector
      )
    }
  }

  watchPlay = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(instance.prefix, baseLineupActions.PLAY),
        play,
        instance.actions,
        instance.selector,
        instance.prefix
      )
    }
  }

  watchTogglePlay = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(
          instance.prefix,
          baseLineupActions.TOGGLE_PLAY
        ),
        togglePlay,
        instance.actions,
        instance.selector,
        instance.prefix
      )
    }
  }

  watchPauseTrack = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(instance.prefix, baseLineupActions.PAUSE),
        pause
      )
    }
  }

  watchReset = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(instance.prefix, baseLineupActions.RESET),
        reset,
        instance.actions
      )
    }
  }

  watchAdd = () => {
    const instance = this
    return function* () {
      yield* takeEvery(
        baseLineupActions.addPrefix(instance.prefix, baseLineupActions.ADD),
        add
      )
    }
  }

  watchUpdateLineupOrder = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(
          instance.prefix,
          baseLineupActions.UPDATE_LINEUP_ORDER
        ),
        updateLineupOrder,
        instance.prefix,
        instance.sourceSelector
      )
    }
  }

  watchRefreshInView = () => {
    const instance = this
    return function* () {
      yield* takeLatest(
        baseLineupActions.addPrefix(
          instance.prefix,
          baseLineupActions.REFRESH_IN_VIEW
        ),
        refreshInView,
        instance.actions,
        instance.selector
      )
    }
  }

  getSagas() {
    return [
      this.watchFetchLineupMetadata(),
      this.watchPlay(),
      this.watchPauseTrack(),
      this.watchTogglePlay(),
      this.watchReset(),
      this.watchAdd(),
      this.watchUpdateLineupOrder(),
      this.watchRefreshInView()
    ]
  }
}
