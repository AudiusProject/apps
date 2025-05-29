import { initialCacheState } from '~/store/cache/reducer'
import { makeUid } from '~/utils/uid'

import { Collection, ID, Kind, PlaylistTrackId } from '../../../models'
import {
  AddEntriesAction,
  AddSuccededAction,
  ADD_ENTRIES,
  ADD_SUCCEEDED
} from '../actions'
import { Entry } from '../types'

import { SET_PERMALINK, setPermalink } from './actions'
import { CollectionsCacheState } from './types'

const initialState = {
  ...initialCacheState,
  permalinks: {}
}

const addEntries = (state: CollectionsCacheState, entries: any[]) => {
  const newPermalinks: Record<string, ID> = {}

  // Add uids to track info in playlist_contents
  // This allows collection tiles to be played when uid would not normally be present
  entries.forEach((entry) => {
    entry.metadata.playlist_contents.track_ids.forEach(
      (track: PlaylistTrackId) => {
        if (!track.uid) {
          track.uid = makeUid(
            Kind.TRACKS,
            track.track,
            `collection:${entry.metadata.playlist_id}`
          )
        }
      }
    )
  })

  for (const entry of entries) {
    const { playlist_id, permalink } = entry.metadata

    if (permalink) {
      newPermalinks[permalink.toLowerCase()] = playlist_id
    }
  }

  return {
    ...state,
    permalinks: {
      ...state.permalinks,
      ...newPermalinks
    }
  }
}

const actionsMap = {
  [ADD_SUCCEEDED](
    state: CollectionsCacheState,
    action: AddSuccededAction<Collection>
  ) {
    const { entries } = action
    return addEntries(state, entries)
  },
  [ADD_ENTRIES](
    state: CollectionsCacheState,
    action: AddEntriesAction<Collection>,
    kind: Exclude<Kind, Kind.TRACKS | Kind.COLLECTIONS>
  ) {
    const { entriesByKind } = action
    const matchingEntries = entriesByKind[kind]

    if (!matchingEntries) return state
    const cacheableEntries: Entry[] = Object.entries(matchingEntries).map(
      ([id, entry]) => ({
        id: parseInt(id, 10),
        metadata: entry
      })
    )
    return addEntries(state, cacheableEntries)
  },
  [SET_PERMALINK](
    state: CollectionsCacheState,
    action: ReturnType<typeof setPermalink>
  ): CollectionsCacheState {
    const { permalink, collectionId } = action

    if (!permalink) return state
    return {
      ...state,
      permalinks: {
        ...state.permalinks,
        [permalink.toLowerCase()]: collectionId
      }
    }
  }
}

const reducer = (
  state = initialState,
  action: any,
  kind: Exclude<Kind, Kind.TRACKS | Kind.COLLECTIONS>
) => {
  const matchingReduceFunction = actionsMap[action.type]
  if (!matchingReduceFunction) return state
  return matchingReduceFunction(state, action, kind)
}

export default reducer
