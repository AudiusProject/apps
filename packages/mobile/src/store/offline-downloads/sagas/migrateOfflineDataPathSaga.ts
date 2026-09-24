import path from 'path'

import * as RNFS from '@dr.pogodin/react-native-fs'
import { difference } from 'lodash'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { call, put, select } from 'typed-redux-saga'

import { make, track } from 'app/services/analytics'
import { downloadsRoot } from 'app/services/offline-downloader'
import {
  getOfflineCollectionsStatus,
  getOfflineQueue,
  getOfflineTrackStatus
} from 'app/store/offline-downloads/selectors'
import type { OfflineJob } from 'app/store/offline-downloads/slice'
import { redownloadOfflineItems } from 'app/store/offline-downloads/slice'
import { EventNames } from 'app/types/analytics'

import { DOWNLOAD_REASON_FAVORITES } from '../constants'

const {
  fs: { dirs, unlink, exists }
} = ReactNativeBlobUtil

// Current migration: 4/3/2023
// dirs.DocumentDir -> dirs.CacheDir
const legacyDownloadsRoot = path.join(dirs.DocumentDir, 'downloads')

// Move downloads from legacy storage location to the updated path (currently: /Documents -> /Caches)
export function* migrateOfflineDataPathSaga() {
  const legacyFilesExist = yield* call(exists, legacyDownloadsRoot)
  if (!legacyFilesExist) return

  track(
    make({
      eventName: EventNames.OFFLINE_MODE_FILEPATH_MIGRATION_STARTED
    })
  )

  try {
    yield* call(copyRecursive, legacyDownloadsRoot, downloadsRoot)

    track(
      make({
        eventName: EventNames.OFFLINE_MODE_FILEPATH_MIGRATION_SUCCESS
      })
    )
  } catch (e) {
    track(
      make({
        eventName: EventNames.OFFLINE_MODE_FILEPATH_MIGRATION_FAILURE
      })
    )
    // If we fail, nuke the legacy directory to ensure we don't retry the process on every startup
    // also requeue everything for download
    yield* call(migrationRecovery)
  } finally {
    yield* call(unlink, legacyDownloadsRoot)
  }
}

// Util to recursively copy a directory since neither RNFS or react-native-blob-util come with one
async function copyRecursive(source: string, destination: string) {
  // reads items from source directory
  const items = await RNFS.readDir(source)

  // creates destination directory
  if (!(await RNFS.exists(destination))) {
    await RNFS.mkdir(destination)
  }

  await Promise.all(
    items.map(async (item) => {
      //  item is a file
      if (item.isFile() === true) {
        const destinationFile = `${destination}/${item.name}`

        if (!(await exists(destinationFile))) {
          await RNFS.moveFile(item.path, destinationFile)
        }
      } else {
        // item is a directory
        const subDirectory = `${source}/${item.name}`
        const subDestinationDirectory = `${destination}/${item.name}`

        await copyRecursive(subDirectory, subDestinationDirectory)
      }
    })
  )
}

export function* migrationRecovery() {
  const queueJobs: OfflineJob[] = yield* select(getOfflineQueue)
  const collections = yield* select(getOfflineCollectionsStatus)
  const tracks = yield* select(getOfflineTrackStatus)

  const collectionJobs: OfflineJob[] = Object.keys(collections)
    .filter((collectionId) => collectionId !== DOWNLOAD_REASON_FAVORITES)
    .map((collectionId) => ({
      id: parseInt(collectionId),
      type: 'collection'
    }))
  const trackJobs: OfflineJob[] = Object.keys(tracks).map((trackId) => ({
    id: parseInt(trackId),
    type: 'track'
  }))

  const newJobs = difference([...collectionJobs, ...trackJobs], queueJobs)
  yield* put(redownloadOfflineItems({ items: newJobs }))
}
