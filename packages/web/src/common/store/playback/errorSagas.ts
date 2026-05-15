import { playbackActions } from '@audius/common/store'

import { createErrorSagas } from 'utils/errorSagas'

const { error } = playbackActions

type PlaybackErrors = ReturnType<typeof error>

const errorSagas = createErrorSagas<PlaybackErrors>({
  errorTypes: [error.type],
  getShouldRedirect: () => false,
  getShouldReport: () => true,
  getAdditionalInfo: (action: any) => ({
    error: action.error,
    trackId: action.trackId,
    info: action.info
  })
})

export default errorSagas
