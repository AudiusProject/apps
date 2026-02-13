import {
  getCollectionQueryKey,
  queryCollection,
  queryCollectionByPermalink,
  queryTracks
} from '@audius/common/api'
import { Kind } from '@audius/common/models'
import {
  collectionPageLineupActions as tracksActions,
  collectionPageSelectors,
  getContext,
  queueSelectors
} from '@audius/common/store'
import { dayjs, removeNullable, Uid } from '@audius/common/utils'
import { keyBy } from 'lodash'
import { select, call } from 'redux-saga/effects'

import { hasPendingPlaylistUpdates } from 'common/store/cache/collections/utils/hasPendingPlaylistUpdates'
import { LineupSagas } from 'common/store/lineup/sagas'

const { getPositions } = queueSelectors
const { getCollectionId, getCollectionTracksLineup, getCollectionPermalink } =
  collectionPageSelectors

function* getCollectionTracks() {
  const permalink = yield select(getCollectionPermalink)
  const collectionId = yield select(getCollectionId)
  let collection

  const pending = collectionId
    ? yield* hasPendingPlaylistUpdates(collectionId)
    : false

  if (pending && collectionId) {
    const queryClient = yield getContext('queryClient')
    collection = queryClient.getQueryData(getCollectionQueryKey(collectionId))
  }
  if (!collection) {
    if (permalink) {
      collection = yield call(queryCollectionByPermalink, permalink)
    } else if (collectionId) {
      collection = yield call(queryCollection, collectionId)
    }
  }

  if (!collection) return []

  const tracks = collection.playlist_contents.track_ids

  const trackIds = tracks.map((t) => t.track)
  // TODO: Conform all timestamps to be of the same format so we don't have to do any special work here.
  // Some playlists & albums may not have a metadata time, so use the time if not.
  // If for whatever reason, the metadata time is off, prefer the release date
  const times = tracks.map((t) =>
    Math.max(t.metadata_time || t.time, dayjs(collection.release_date).unix())
  )

  // Reconcile fetching this playlist with the queue.
  // Search the queue for its currently playing uids. If any are sourced
  // from `this` collection, use their uids rather than allowing
  // the lineup to generate fresh ones.
  // This allows the user to navigate back and forth between playlists and other
  // pages without losing their currently playing position in the playlist.
  // TODO: Investigate a better pattern to solve this.
  const queueUids = Object.keys(yield select(getPositions)).map((uid) =>
    Uid.fromString(uid)
  )
  const thisSource = yield select(sourceSelector)
  // Gets uids in the queue for this source in the form: { id: [uid1, uid2] }
  // as there might be two uids in the playlist for the same id.
  const uidForSource = queueUids
    .filter((uid) => uid.source === thisSource)
    .reduce((mapping, uid) => {
      if (uid.id in mapping) {
        mapping[uid.id].push(uid.toString())
      } else {
        mapping[uid.id] = [uid.toString()]
      }
      return mapping
    }, {})

  if (trackIds.length > 0) {
    const trackMetadatas = yield call(queryTracks, trackIds)
    const keyedMetadatas = keyBy(trackMetadatas, (m) => m.track_id)

    return trackIds
      .map((id, i) => {
        const metadata = { ...keyedMetadatas[id] }

        // For whatever reason, the track id was retrieved and doesn't exist or is malformatted.
        // This can happen if the collection references an unlisted track or one that
        // doesn't (or never has) existed.
        if (!metadata.track_id) return null

        if (times[i]) {
          metadata.dateAdded = dayjs.unix(times[i])
        }
        if (uidForSource[id] && uidForSource[id].length > 0) {
          metadata.uid = uidForSource[id].shift()
        } else if (tracks[i].uid) {
          metadata.uid = tracks[i].uid
        }
        return metadata
      })
      .filter(removeNullable)
  }
  return []
}

const keepDateAdded = (track) => ({
  id: track.track_id,
  uid: track.uid,
  kind: Kind.TRACKS,
  dateAdded: track.dateAdded
})

const sourceSelector = (state) => `collection:${getCollectionId(state)}`

class TracksSagas extends LineupSagas {
  constructor() {
    super(
      tracksActions.prefix,
      tracksActions,
      getCollectionTracksLineup,
      getCollectionTracks,
      keepDateAdded,
      /* removeDeleted */ false,
      sourceSelector
    )
  }
}

export default function sagas() {
  return new TracksSagas().getSagas()
}
