import {
  queryCurrentAccount,
  queryTrack,
  queryTracks
} from '@audius/common/api'
import { Collection, ID, Kind, LineupEntry, UID } from '@audius/common/models'
import {
  libraryPageTracksLineupActions as savedTracksActions,
  libraryPageActions as saveActions,
  libraryPageSelectors,
  LibraryCategory,
  LibraryPageTabs,
  queueActions,
  queueSelectors,
  QueueSource,
  tracksSocialActions,
  getContext,
  playerSelectors,
  purchaseContentActions,
  PurchaseableContentType,
  LibraryPageTrack,
  AccountState
} from '@audius/common/store'
import { makeUid } from '@audius/common/utils'
import { uniq } from 'lodash'
import moment from 'moment'
import { call, select, put, takeEvery } from 'typed-redux-saga'

import { LineupSagas } from 'common/store/lineup/sagas'
import { AppState } from 'store/types'

const { getUid: getPlayerUid } = playerSelectors
const { getSource } = queueSelectors
const { FETCH_SAVES, FETCH_MORE_SAVES } = saveActions
const { SAVE_TRACK, UNSAVE_TRACK, REPOST_TRACK, UNDO_REPOST_TRACK } =
  tracksSocialActions
const {
  getLocalTrackFavorite,
  getLocalTrackRepost,
  getLibraryTracksLineupUid,
  getTrackSaves,
  getSelectedCategoryLocalTrackAdds,
  getCategory
} = libraryPageSelectors
const { purchaseConfirmed } = purchaseContentActions

const getLibraryTracks = (state: AppState) => state.pages.libraryPage.tracks

const PREFIX = savedTracksActions.prefix

function* getTracks({ offset, limit }: { offset: number; limit: number }) {
  const isNativeMobile = yield* getContext('isNativeMobile')
  const allSavedTracks = yield* select(getTrackSaves)
  // Mobile currently uses infinite scroll instead of a virtualized list
  // so we need to apply the offset & limit
  const savedTracks = isNativeMobile
    ? allSavedTracks.slice(offset, offset + limit)
    : allSavedTracks

  const savedTrackIds = savedTracks.map((save) => save.save_item_id ?? null)
  const savedTrackTimestamps = savedTracks.reduce((map, save) => {
    map[save.save_item_id] = save.created_at
    return map
  }, {})

  const localLibraryAdditions = yield* select(getSelectedCategoryLocalTrackAdds)
  const localLibraryAdditionsTrackIds = Object.keys(localLibraryAdditions)
    .filter((savedTrackId) => !savedTrackTimestamps[savedTrackId])
    .map((trackId) => Number(trackId))

  const localLibraryAdditionsTimestamps = localLibraryAdditionsTrackIds.reduce(
    (map, saveId) => {
      map[saveId] = Date.now()
      return map
    },
    {}
  )

  let allSavedTrackIds: (number | string)[] = []

  if (isNativeMobile && offset !== 0) {
    allSavedTrackIds = savedTrackIds.filter(
      (s) => !localLibraryAdditionsTrackIds.includes(s)
    )
  } else {
    allSavedTrackIds = uniq([
      ...localLibraryAdditionsTrackIds,
      ...savedTrackIds
    ])
  }

  const allSavedTrackTimestamps = {
    ...localLibraryAdditionsTimestamps,
    ...savedTrackTimestamps
  } as Record<ID, string>

  if (allSavedTrackIds.length > 0) {
    const tracks = yield* call(
      // @ts-ignore - Mobile for some reason fails to type-check this
      queryTracks,
      allSavedTrackIds.filter((id) => id !== null && typeof id === 'number')
    )

    const tracksMap = tracks.reduce((map, track) => {
      const save = {
        ...track,
        dateSaved: allSavedTrackTimestamps[track.track_id]
      }

      map[track.track_id] = save
      return map
    }, {})
    return allSavedTrackIds.map((id) =>
      id ? tracksMap[id] : { kind: Kind.EMPTY }
    )
  }
  return []
}

const keepDateSaved = (entry: LineupEntry<LibraryPageTrack | Collection>) => ({
  uid: entry.uid,
  kind: entry.kind ?? ('track_id' in entry ? Kind.TRACKS : Kind.COLLECTIONS),
  id: 'track_id' in entry ? entry.track_id : entry.playlist_id,
  dateSaved: 'dateSaved' in entry ? entry.dateSaved : null
})

const sourceSelector = () => PREFIX

class SavedTracksSagas extends LineupSagas<LibraryPageTrack> {
  constructor() {
    super(
      PREFIX,
      savedTracksActions,
      getLibraryTracks,
      getTracks,
      keepDateSaved,
      /* removeDeleted */ false,
      sourceSelector
    )
  }
}

function* watchFetchSaves() {
  yield* takeEvery(
    [FETCH_SAVES, FETCH_MORE_SAVES],
    function* (_action: ReturnType<typeof saveActions.fetchSaves>) {
      const accountData = (yield* call(queryCurrentAccount)) as AccountState
      if (!accountData) return
      const { trackSaveCount } = accountData

      if (trackSaveCount) {
        yield* put(savedTracksActions.setMaxEntries(trackSaveCount))
      }
    }
  )
}

// If a local save is being done and the user is on the saved page route, make sure to update the lineup.
function* watchAddToLibrary() {
  yield* takeEvery(
    [SAVE_TRACK, REPOST_TRACK, purchaseConfirmed.type],
    function* (
      action:
        | ReturnType<typeof tracksSocialActions.saveTrack>
        | ReturnType<typeof tracksSocialActions.repostTrack>
        | ReturnType<typeof purchaseContentActions.purchaseConfirmed>
    ) {
      const { type } = action
      if (
        type === purchaseContentActions.purchaseConfirmed.type &&
        'payload' in action &&
        action.payload.contentType !== PurchaseableContentType.TRACK
      ) {
        return
      }

      const trackId =
        'trackId' in action ? action.trackId : action.payload.contentId
      const track = yield* queryTrack(trackId)

      if (!track || (track.has_current_user_saved && type === SAVE_TRACK)) {
        return
      }

      const localSaveUid = makeUid(
        Kind.TRACKS,
        trackId,
        savedTracksActions.prefix
      )

      const newEntry: LineupEntry<Partial<LibraryPageTrack>> = {
        uid: localSaveUid,
        kind: Kind.TRACKS,
        id: trackId,
        dateSaved: moment().format()
      }

      let relevantCategory
      if (type === SAVE_TRACK) {
        relevantCategory = LibraryCategory.Favorite
      } else if (type === REPOST_TRACK) {
        relevantCategory = LibraryCategory.Repost
      } else {
        relevantCategory = LibraryCategory.Purchase
      }
      yield* put(
        saveActions.addLocalTrack({
          trackId,
          uid: localSaveUid,
          category: relevantCategory
        })
      )

      const isTrackAlreadyInLineup = yield* select(
        (state, props) => {
          const lineupUid = getLibraryTracksLineupUid(state, props)
          return lineupUid != null
        },
        { id: trackId }
      )
      const currentCategory = yield* select(getCategory, {
        currentTab: LibraryPageTabs.TRACKS
      })
      const actionMatchesCurrentCategory = currentCategory === relevantCategory
      if (actionMatchesCurrentCategory && !isTrackAlreadyInLineup) {
        // @ts-ignore - Partial track metadata can be passed here for local saves
        yield* put(savedTracksActions.add(newEntry, trackId, undefined, true))

        const queueSource = yield* select(getSource)
        if (queueSource === QueueSource.SAVED_TRACKS) {
          yield* put(
            queueActions.add({
              entries: [
                {
                  id: trackId,
                  uid: localSaveUid,
                  source: QueueSource.SAVED_TRACKS
                }
              ]
            })
          )
        }
      }
    }
  )
}

function* watchRemoveFromLibrary() {
  yield* takeEvery(
    [UNSAVE_TRACK, UNDO_REPOST_TRACK],
    function* (
      action:
        | ReturnType<typeof tracksSocialActions.unsaveTrack>
        | ReturnType<typeof tracksSocialActions.undoRepostTrack>
    ) {
      const { trackId, type } = action
      const removedTrackSelector =
        type === UNSAVE_TRACK ? getLocalTrackFavorite : getLocalTrackRepost
      const localSaveUid: UID = yield* select(removedTrackSelector, {
        id: trackId
      })
      const currentCategory = yield* select(getCategory, {
        currentTab: LibraryPageTabs.TRACKS
      })

      yield* put(
        saveActions.removeLocalTrack({
          trackId: action.trackId,
          category:
            type === UNSAVE_TRACK
              ? LibraryCategory.Favorite
              : LibraryCategory.Repost
        })
      )

      if (
        (type === UNSAVE_TRACK &&
          currentCategory === LibraryCategory.Favorite) ||
        (type === UNDO_REPOST_TRACK &&
          currentCategory === LibraryCategory.Repost)
      ) {
        const playerUid = yield* select(getPlayerUid)
        const queueSource = yield* select(getSource)
        if (localSaveUid) {
          yield* put(savedTracksActions.remove(Kind.TRACKS, localSaveUid))
          if (
            localSaveUid !== playerUid &&
            queueSource === QueueSource.SAVED_TRACKS
          ) {
            yield* put(queueActions.remove({ uid: localSaveUid }))
          }
        }
        const lineupSaveUid = yield* select(getLibraryTracksLineupUid, {
          id: trackId
        })
        if (lineupSaveUid) {
          yield* put(savedTracksActions.remove(Kind.TRACKS, lineupSaveUid))
          if (lineupSaveUid !== playerUid) {
            yield* put(queueActions.remove({ uid: lineupSaveUid }))
          }
        }
      }
    }
  )
}

export default function sagas() {
  return new SavedTracksSagas()
    .getSagas()
    .concat(watchAddToLibrary, watchRemoveFromLibrary, watchFetchSaves)
}
