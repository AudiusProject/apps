import { takeEvery, put } from 'redux-saga/effects'

import * as errorActions from 'store/errors/actions'

/**
 * Creates error sagas.
 */
export const createErrorSagas = <ActionType extends { type: string }>({
  errorTypes, // list of action types to listen for
  getShouldRedirect,
  getShouldReport,
  getType = (actionType: string) => actionType, // optionally modify the error type sent to our error reporting service
  getAdditionalInfo = (action: ActionType) => ({})
}: {
  errorTypes: string[]
  getShouldRedirect: (action: ActionType) => boolean
  getShouldReport: (action: ActionType) => boolean
  getType?: (actionType: string) => string
  getAdditionalInfo?: (action: ActionType) => Record<string, unknown>
}) => {
  function* handleError(action: ActionType) {
    console.info(`Handling error: ${JSON.stringify(action)}`)
    const shouldRedirect = getShouldRedirect(action)
    const shouldReport = getShouldReport(action)
    const actionType = getType(action.type)
    const additionalInfo = getAdditionalInfo(action)
    yield put(
      errorActions.handleError({
        message: actionType,
        shouldRedirect,
        shouldReport,
        additionalInfo
      })
    )
  }

  return function* watchError() {
    yield takeEvery(errorTypes, handleError)
  }
}
