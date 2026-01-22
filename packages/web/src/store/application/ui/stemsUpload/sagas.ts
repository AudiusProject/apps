import {
  getStemsQueryKey,
  queryCurrentUserId,
  queryTrack
} from '@audius/common/api'
import { Name, StemCategory } from '@audius/common/models'
import { publishStems } from '@audius/common/src/api/tan-query/upload/usePublishStems'
import { getContext, stemsUploadActions } from '@audius/common/store'
import { takeEvery, put, call } from 'typed-redux-saga'

import { make } from 'common/store/analytics/actions'

const { startStemUploads, stemUploadsSucceeded } = stemsUploadActions

function* watchUploadStems() {
  yield* takeEvery(
    startStemUploads.type,
    function* (action: ReturnType<typeof startStemUploads>) {
      const { uploads, parentId, batchUID } = action.payload

      const parentTrack = yield* call(queryTrack, parentId)
      if (!parentTrack) {
        throw new Error(`Parent track with ID ${parentId} not found`)
      }

      const audiusSdk = yield* getContext('audiusSdk')
      const dispatch = yield* getContext('dispatch')
      const reportToSentry = yield* getContext('reportToSentry')
      const analytics = yield* getContext('analytics')
      const userId = yield* call(queryCurrentUserId)
      if (!userId) {
        throw new Error('No user ID found for stem upload')
      }

      const results = yield* call(async () => {
        const sdk = await audiusSdk()
        const uploadHandles = uploads.map((stem, index) => {
          return sdk.tracks.uploadTrackFiles({
            audioFile: stem.file
          })
        })
        const uploadResponses = await Promise.all(
          uploadHandles.map((handle) => handle.start())
        )
        const res = await publishStems(
          {
            audiusSdk,
            dispatch,
            userId,
            reportToSentry,
            analytics
          },
          {
            clientId: batchUID,
            parentTrackId: parentId,
            parentMetadata: parentTrack,
            stems: uploadResponses.map((s, i) => ({
              metadata: uploads[i],
              audioUploadResponse: s.audioUploadResponse!
            }))
          }
        )
        return res
      })

      yield* put(stemUploadsSucceeded({ parentId, batchUID }))

      if (results) {
        for (let i = 0; i < results.length; i += 1) {
          const { trackId, error } = results[i]
          if (error) {
            console.error(`Error uploading stem ${i}:`, error)
            continue
          }
          const category = uploads[i].category ?? StemCategory.OTHER
          const recordEvent = make(Name.STEM_COMPLETE_UPLOAD, {
            id: trackId,
            parent_track_id: parentId,
            category
          })
          yield* put(recordEvent)
        }
      }

      const queryClient = yield* getContext('queryClient')

      queryClient.invalidateQueries({
        queryKey: getStemsQueryKey(parentId)
      })
    }
  )
}

const sagas = () => {
  return [watchUploadStems]
}

export default sagas
