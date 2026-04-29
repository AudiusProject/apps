import { queryTrack } from '@audius/common/api'
import {
  cacheTracksActions as trackCacheActions,
  trackPageActions
} from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import { put, takeEvery } from 'typed-redux-saga'

function* watchTrackPageMakePublic() {
  yield* takeEvery(
    trackPageActions.MAKE_TRACK_PUBLIC,
    function* (action: ReturnType<typeof trackPageActions.makeTrackPublic>) {
      const { trackId } = action
      let track = yield* queryTrack(trackId)

      if (!track) return
      track = {
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

      yield* put(trackCacheActions.editTrack(trackId, track))
    }
  )
}

export default function sagas() {
  return [watchTrackPageMakePublic]
}
