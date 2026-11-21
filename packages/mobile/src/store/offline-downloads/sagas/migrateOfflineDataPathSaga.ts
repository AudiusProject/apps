import path from 'path'

import * as RNFS from '@dr.pogodin/react-native-fs'
import { difference } from 'lodash'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { call, put, select } from 'typed-redux-saga'

import { downloadsRoot } from 'app/services/offline-downloader'
import {
  getOfflineCollectionsStatus,
  getOfflineQueue,
  getOfflineTrackStatus
} from 'app/store/offline-downloads/selectors'
import type { OfflineJob } from 'app/store/offline-downloads/slice'
import { redownloadOfflineItems } from 'app/store/offline-downloads/slice'

import { DOWNLOAD_REASON_FAVORITES } from '../constants'

const {
  fs: { dirs, unlink, exists }
} = ReactNativeBlobUtil

const legacyDownloadsRoot = path.join(dirs.DocumentDir, 'downloads')

export function* migrateOfflineDataPathSaga() {
  const legacyFilesExist = yield* call(exists, legacyDownloadsRoot)
  if (!legacyFilesExist) return

  try {
    yield* call(copyRecursive, legacyDownloadsRoot, downloadsRoot)
  } catch (e) {
    yield* call(migrationRecovery)
  } finally {
    yield* call(unlink, legacyDownloadsRoot)
  }
}

async function copyRecursive(source: string, destination: string) {
  const items = await RNFS.readDir(source)

  if (!(await RNFS.exists(destination))) {
    await RNFS.mkdir(destination)
  }

  await Promise.all(
    items.map(async (item) => {
      if (item.isFile() === true) {
        const destinationFile = `${destination}/${item.name}`

        if (!(await exists(destinationFile))) {
          await RNFS.moveFile(item.path, destinationFile)
        }
      } else {
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
