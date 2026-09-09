import type {
  DownloadFileArgs,
  DownloadTrackArgs
} from '@audius/common/services'
import { TrackDownload as TrackDownloadBase } from '@audius/common/services'
import { tracksSocialActions, downloadsActions } from '@audius/common/store'
import { Platform, Share } from 'react-native'
import type {
  FetchBlobResponse,
  ReactNativeBlobUtilConfig,
  StatefulPromise
} from 'react-native-blob-util'
import ReactNativeBlobUtil from 'react-native-blob-util'
import { zip } from 'react-native-zip-archive'
import { dedupFilenames } from '~/utils'

import { make, track as trackEvent } from 'app/services/analytics'
import { dispatch } from 'app/store'
import { EventNames } from 'app/types/analytics'

const { downloadFinished } = tracksSocialActions
const { beginDownload, setDownloadError, setFetchCancel, setFileInfo } =
  downloadsActions

let fetchTasks: StatefulPromise<FetchBlobResponse>[] = []

const audiusDownloadsDirectory = 'AudiusDownloads'

const cancelDownloadTask = () => {
  fetchTasks.forEach((task) => {
    task.cancel()
  })
}

const removePathIfExists = async (path: string) => {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(path)
    if (!exists) return
    await ReactNativeBlobUtil.fs.unlink(path)
  } catch (err) {
    console.error(err)
  }
}

/**
 * Download a file via ReactNativeBlobUtil
 */
const downloadOne = async ({
  fileUrl,
  filename,
  directory,
  getFetchConfig,
  onFetchComplete
}: {
  fileUrl: string
  filename: string
  directory: string
  getFetchConfig: (filePath: string) => ReactNativeBlobUtilConfig
  onFetchComplete?: (path: string) => Promise<void>
}) => {
  const filePath = directory + '/' + filename

  try {
    const fetchTask = ReactNativeBlobUtil.config(
      getFetchConfig(filePath)
    ).fetch('GET', fileUrl)
    fetchTasks = [fetchTask]

    const fetchRes = await fetchTask

    await onFetchComplete?.(fetchRes.path())

    // Track download success event
    trackEvent(
      make({
        eventName: EventNames.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_SINGLE,
        device: 'native'
      })
    )
  } catch (err) {
    console.error(err)
    dispatch(
      setDownloadError(
        err instanceof Error ? err : new Error(`Download failed: ${err}`)
      )
    )
    // On failure attempt to delete the file
    removePathIfExists(filePath)

    // Track download failure event
    trackEvent(
      make({
        eventName: EventNames.TRACK_DOWNLOAD_FAILED_DOWNLOAD_SINGLE,
        device: 'native'
      })
    )
  }
}

/**
 * Download multiple files via ReactNativeBlobUtil
 */
const downloadMany = async ({
  files,
  directory,
  getFetchConfig,
  onFetchComplete
}: {
  files: { url: string; filename: string }[]
  directory: string
  getFetchConfig: (filePath: string) => ReactNativeBlobUtilConfig
  onFetchComplete?: (path: string) => Promise<void>
}) => {
  dedupFilenames(files)
  let responses
  const tempDir =
    ReactNativeBlobUtil.fs.dirs.DownloadDir + '/' + `AudiusTemp_${Date.now()}`
  try {
    const responsePromises = files.map(({ url, filename }) =>
      ReactNativeBlobUtil.config(
        getFetchConfig(tempDir + '/' + filename)
      ).fetch('GET', url)
    )
    fetchTasks = responsePromises
    responses = await Promise.all(responsePromises)
    if (!responses.every((response) => response.info().status === 200)) {
      throw new Error('Download unsuccessful')
    }

    await zip(tempDir, directory + '.zip')
    await onFetchComplete?.(directory + '.zip')

    // Track download success event
    trackEvent(
      make({
        eventName: EventNames.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_ALL,
        device: 'native'
      })
    )
  } catch (err) {
    console.error(err)
    dispatch(
      setDownloadError(
        err instanceof Error ? err : new Error(`Download failed: ${err}`)
      )
    )

    // Track download failure event
    trackEvent(
      make({
        eventName: EventNames.TRACK_DOWNLOAD_FAILED_DOWNLOAD_ALL,
        device: 'native'
      })
    )
  } finally {
    // Remove source directory at the end of the process regardless of what happens
    removePathIfExists(tempDir)
    try {
      responses.forEach((response) => response.flush())
    } catch (err) {
      console.error(err)
    }
  }
}

const download = async ({
  files,
  rootDirectoryName,
  abortSignal
}: DownloadTrackArgs) => {
  if (files.length === 0) {
    dispatch(setDownloadError(new Error('No downloadable files found')))
    return
  }

  dispatch(beginDownload())

  dispatch(
    setFileInfo({
      trackName: rootDirectoryName ?? '',
      fileName: files[0].filename
    })
  )
  if (abortSignal) {
    abortSignal.onabort = () => {
      cancelDownloadTask()
    }
  }
  // TODO: Remove this method of canceling after the lossless
  // feature set launches. The abort signal should be the way to do
  // this task cancellation going forward.
  dispatch(setFetchCancel(cancelDownloadTask))

  const audiusDirectory =
    ReactNativeBlobUtil.fs.dirs.DocumentDir + '/' + audiusDownloadsDirectory

  if (Platform.OS === 'ios') {
    const onFetchComplete = async (path: string) => {
      try {
        dispatch(downloadFinished())
        await Share.share({
          url: path
        })
      } finally {
        // The fetched file is temporary on iOS and we always want to be sure to
        // remove it.
        removePathIfExists(path)
      }
    }
    if (files.length === 1) {
      const { url, filename } = files[0]
      downloadOne({
        fileUrl: url,
        filename,
        directory: audiusDirectory,
        getFetchConfig: (filePath) => ({
          /* iOS single file download will stage a file into a temporary location, then use the
           * share sheet to let the user decide where to put it. Afterwards we delete the temp file.
           */
          fileCache: true,
          path: filePath
        }),
        onFetchComplete
      })
    } else {
      downloadMany({
        files,
        directory: audiusDirectory + '/' + rootDirectoryName,
        getFetchConfig: (filePath) => ({
          /* iOS multi-file download will download all files to a temp location and then create a ZIP and
           * let the user decide where to put it with the Share sheet. The temp files are deleted after the ZIP is created.
           */
          fileCache: true,
          path: filePath
        }),
        onFetchComplete
      })
    }
  } else {
    if (files.length === 1) {
      const { url, filename } = files[0]
      downloadOne({
        fileUrl: url,
        filename,
        /* Single file download on Android will use the Download Manager and go
         * straight to the Downloads directory.
         */
        directory: ReactNativeBlobUtil.fs.dirs.DownloadDir,
        getFetchConfig: () => ({
          addAndroidDownloads: {
            description: filename,
            mediaScannable: true,
            notification: true,
            storeInDownloads: true,
            title: filename,
            useDownloadManager: true
          }
        }),
        onFetchComplete: async () => {
          dispatch(downloadFinished())
        }
      })
    } else {
      if (!rootDirectoryName)
        throw new Error(
          'rootDirectory must be supplied when downloading multiple files'
        )
      downloadMany({
        files,
        /* Multi-file download on Android will stage the files in a temporary directory
         * under the downloads folder and then zip them. We don't use Download Manager for
         * the initial downloads to avoid showing notifications, then manually add a
         * notification for the zip file.
         */
        directory:
          ReactNativeBlobUtil.fs.dirs.DownloadDir + '/' + rootDirectoryName,
        getFetchConfig: (filePath) => ({
          fileCache: true,
          path: filePath
        }),
        onFetchComplete: async (path: string) => {
          let mediaStoragePath
          // On android 13+, we need to manually copy to media storage
          try {
            mediaStoragePath =
              await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
                {
                  // The name of the file that should show up in Downloads as a .zip
                  name: rootDirectoryName,
                  // Can be left empty as we're putting the file into downloads
                  parentFolder: '',
                  mimeType: 'application/zip'
                },
                'Download',
                path
              )
          } catch (e) {
            console.error(e)
            // Continue on because on android <13+ the media storage copy will
            // not work, but we can deliver the file to the old download system
            // by calling android.addCompleteDownload.
          }
          // We still need to add the complete download notification here anyway
          // even if on android 13+
          ReactNativeBlobUtil.android.addCompleteDownload({
            title: rootDirectoryName,
            description: rootDirectoryName,
            mime: 'application/zip',
            path: mediaStoragePath ?? path,
            showNotification: true
          })
          dispatch(downloadFinished())
        }
      })
    }
  }
}

/** Generic file download that doesn't use sagas. */
const downloadFile = async ({
  file: { url, filename },
  mimeType,
  abortSignal
}: DownloadFileArgs) => {
  if (Platform.OS === 'ios') {
    const audiusDirectory =
      ReactNativeBlobUtil.fs.dirs.DocumentDir + '/' + audiusDownloadsDirectory
    const filePath = audiusDirectory + '/' + filename
    try {
      const fetchPromise = ReactNativeBlobUtil.config({
        /* on iOS we stage the file into a temporary location, then use the
         * share sheet to let the user decide where to put it.
         * Afterwards we delete the temp file.
         */
        fileCache: true,
        path: filePath
      }).fetch('GET', url)

      abortSignal?.addEventListener('abort', () => {
        fetchPromise.cancel()
      })
      await fetchPromise

      await Share.share({
        url: filePath
      })
    } finally {
      // The fetched file is temporary on iOS and we always want to be sure to remove it.
      removePathIfExists(filePath)
    }
  } else {
    // On Android we use the Download Manager to download the file.
    const fetchPromise = ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        description: filename,
        mediaScannable: true,
        notification: true,
        storeInDownloads: true,
        title: filename,
        mime: mimeType,
        useDownloadManager: true
      }
    }).fetch('GET', url)

    abortSignal?.addEventListener('abort', () => {
      fetchPromise.cancel()
    })
    await fetchPromise
  }
}

class TrackDownload extends TrackDownloadBase {
  async downloadTracks(args: DownloadTrackArgs) {
    await download(args)
  }

  async downloadFile(args: DownloadFileArgs) {
    await downloadFile(args)
  }
}

export const trackDownload = new TrackDownload()
