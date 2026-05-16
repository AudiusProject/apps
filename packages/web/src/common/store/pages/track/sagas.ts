import {
  trackMetadataForUploadToSdk,
  userTrackMetadataFromSDK
} from '@audius/common/adapters'
import {
  queryCurrentUserId,
  queryTrack,
  updateTrackData
} from '@audius/common/api'
import { getSDK, trackPageActions } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import { Id, OptionalId } from '@audius/sdk'
import { call, takeEvery } from 'typed-redux-saga'

/**
 * Listens for the legacy `MAKE_TRACK_PUBLIC` action (still dispatched by
 * components and a couple of inner sagas) and performs the SDK update
 * inline. Replaces the previous chain that went through
 * `cacheTracksActions.editTrack` -> `cache/tracks/sagas` -> confirmer queue,
 * which is gone now that edits live in `useUpdateTrack`.
 */
function* watchTrackPageMakePublic() {
  yield* takeEvery(
    trackPageActions.MAKE_TRACK_PUBLIC,
    function* (action: ReturnType<typeof trackPageActions.makeTrackPublic>) {
      const { trackId } = action
      const track = yield* queryTrack(trackId)
      if (!track) return

      const userId = yield* call(queryCurrentUserId)
      if (!userId) return

      const updatedTrack = {
        ...track,
        is_unlisted: false,
        release_date: dayjs().toString(),
        is_scheduled_release: false,
        field_visibility: {
          genre: true,
          mood: true,
          tags: true,
          share: true,
          play_count: true,
          remixes: track?.field_visibility?.remixes ?? true
        }
      }

      // Optimistic update so UI reflects "public" immediately.
      yield* call(updateTrackData, [updatedTrack])

      const sdk = yield* getSDK()
      try {
        yield* call([sdk.tracks, sdk.tracks.updateTrack], {
          userId: Id.parse(userId),
          trackId: Id.parse(trackId),
          metadata: trackMetadataForUploadToSdk(updatedTrack)
        })
        // Reconcile with server-side state.
        const { data } = yield* call([sdk.tracks, sdk.tracks.getTrack], {
          trackId: Id.parse(trackId),
          userId: OptionalId.parse(userId)
        })
        if (data) {
          const refreshed = userTrackMetadataFromSDK(data)
          if (refreshed) {
            yield* call(updateTrackData, [refreshed])
          }
        }
      } catch (error) {
        // Roll back the optimistic update.
        yield* call(updateTrackData, [track])
        console.error(
          'Make Track Public',
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
  )
}

export default function sagas() {
  return [watchTrackPageMakePublic]
}
