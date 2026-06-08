import { tracksSocialActions as socialTrackActions } from '@audius/common/store'

import { createErrorSagas } from 'utils/errorSagas'

type TrackRepostErrors =
  | ReturnType<typeof socialTrackActions.trackRepostFailed>
  | ReturnType<typeof socialTrackActions.saveTrackFailed>
  | ReturnType<typeof socialTrackActions.unsaveTrackFailed>

const errorSagas = createErrorSagas<TrackRepostErrors>({
  errorTypes: [
    socialTrackActions.REPOST_FAILED,
    socialTrackActions.UNSAVE_TRACK_FAILED,
    socialTrackActions.SAVE_TRACK_FAILED
  ],
  getShouldRedirect: () => false,
  getShouldReport: () => true,
  getAdditionalInfo: (action: TrackRepostErrors) => ({
    error: action.error,
    trackId: action.trackId
  })
})

export default errorSagas
