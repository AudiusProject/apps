import { clearOfflineDownloadsSaga } from './sagas/clearOfflineDownloadsSaga'
import { offlineQueueSagas } from './sagas/offlineQueueSagas/offlineQueueSagas'
import { rehydrateOfflineDataSaga } from './sagas/rehydrateOfflineDataSaga'
import { requestDownloadAllFavoritesSaga } from './sagas/requestDownloadAllFavoritesSaga'
import { requestDownloadCollectionSaga } from './sagas/requestDownloadCollectionSaga'
import { requestDownloadFavoritedCollectionSaga } from './sagas/requestDownloadFavoritedCollectionSaga'
import { requestRemoveAllDownloadedFavoritesSaga } from './sagas/requestRemoveAllDownloadedFavoritesSaga'
import { requestRemoveDownloadedCollectionSaga } from './sagas/requestRemoveDownloadedCollectionSaga'
import { syncOfflineDataSaga } from './sagas/syncOfflineDataSaga'
import { watchAddTrackToPlaylistSaga } from './sagas/watchAddTrackToPlaylistSaga'
import { watchRemoveOfflineItems } from './sagas/watchRemoveOfflineItems'
import { watchSaveCollectionSaga } from './sagas/watchSaveCollectionSaga'
import { watchSaveTrackSaga } from './sagas/watchSaveTrackSaga'
import { watchUnsaveCollectionSaga } from './sagas/watchUnsaveCollectionSaga'
import { watchUnsaveTrackSaga } from './sagas/watchUnsaveTrackSaga'

const sagas = () => {
  return [
    rehydrateOfflineDataSaga,
    syncOfflineDataSaga,

    requestDownloadAllFavoritesSaga,
    requestDownloadCollectionSaga,
    requestDownloadFavoritedCollectionSaga,
    requestRemoveAllDownloadedFavoritesSaga,
    requestRemoveDownloadedCollectionSaga,

    ...offlineQueueSagas(),

    watchSaveTrackSaga,
    watchUnsaveTrackSaga,
    watchSaveCollectionSaga,
    watchUnsaveCollectionSaga,
    watchRemoveOfflineItems,
    watchAddTrackToPlaylistSaga,

    clearOfflineDownloadsSaga
  ]
}

export default sagas
