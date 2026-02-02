import {
  queryAccountUser,
  queryTrack,
  queryCollection
} from '@audius/common/api'
import { UPLOAD_TRACKS_SUCCEEDED } from '@audius/common/src/store/upload/actions'
import { uploadActions, toastActions, UploadType } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { IconArrowRight, IconCloudUpload } from '@audius/harmony'
import { matchPath } from 'react-router'
import { call, put, select, takeEvery } from 'typed-redux-saga'

import { reportToSentry } from 'store/errors/reportToSentry'
import { profilePage } from 'utils/route'

const { toast } = toastActions
const { UPLOAD_PAGE } = route
const { uploadTracksSucceeded } = uploadActions

/**
 * Handles upload success by showing a toast notification with a link to the uploaded entity
 * or profile page if the user is not on the upload page.
 */
function* handleUploadSuccess(
  action: ReturnType<typeof uploadTracksSucceeded>
) {
  const id = action.id

  // Check if user is still on upload page
  const isOnUploadPage =
    typeof window !== 'undefined' &&
    matchPath(UPLOAD_PAGE, window.location.pathname) !== null

  if (isOnUploadPage) return

  // Get upload state before it gets cleared
  const uploadState = yield* select((state) => state.upload)
  const uploadType = uploadState.uploadType
  let completionLink: string | undefined

  // Get permalink for entity
  try {
    if (
      uploadType === UploadType.INDIVIDUAL_TRACK ||
      uploadType === UploadType.INDIVIDUAL_TRACKS
    ) {
      const track = yield* call(queryTrack, id)
      completionLink = track?.permalink
    } else if (
      uploadType === UploadType.ALBUM ||
      uploadType === UploadType.PLAYLIST
    ) {
      const collection = yield* call(queryCollection, id)
      completionLink = collection?.permalink
    }
  } catch (e) {
    console.error('Error fetching uploaded entity for completion link', e)
    reportToSentry({
      error: e as Error
    })
  }

  if (!completionLink) {
    // Fallback to profile page if we couldn't get the entity permalink
    const accountUser = yield* call(queryAccountUser)
    const accountHandle = accountUser?.handle

    if (!accountHandle) {
      yield* put(
        toast({
          content: 'Your upload is complete!',
          type: 'info'
        })
      )
      return
    }
    completionLink = profilePage(accountHandle)
  }

  yield* put(
    toast({
      content: 'Your upload is complete!',
      link: completionLink,
      linkText: 'View',
      leftIcon: IconCloudUpload,
      rightIcon: IconArrowRight
    })
  )
}

function* watchUploadSuccess() {
  yield* takeEvery(UPLOAD_TRACKS_SUCCEEDED, handleUploadSuccess)
}

export default function sagas() {
  return [watchUploadSuccess]
}
