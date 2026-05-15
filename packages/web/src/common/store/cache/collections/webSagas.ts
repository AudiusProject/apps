import commonSagas from './commonSagas'
import { createPlaylistRequestedSaga } from './createPlaylistRequestedSaga'
import { duplicatePlaylistSaga } from './duplicatePlaylistSaga'

export default function sagas() {
  return [...commonSagas(), createPlaylistRequestedSaga, duplicatePlaylistSaga]
}
