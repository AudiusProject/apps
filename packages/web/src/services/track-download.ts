import { Name } from '@audius/common/models'
import {
  DownloadFile,
  TrackDownload as TrackDownloadBase,
  type DownloadTrackArgs
} from '@audius/common/services'
import { tracksSocialActions, downloadsActions } from '@audius/common/store'
import { dedupFilenames } from '@audius/common/utils'
import { downloadZip } from 'client-zip'

import { track as trackEvent } from './analytics/amplitude'

const { downloadFinished } = tracksSocialActions

const { beginDownload, setDownloadError } = downloadsActions

function isMobileSafari() {
  if (!navigator) return false
  return (
    navigator.userAgent.match(/(iPod|iPhone|iPad)/) &&
    navigator.userAgent.match(/AppleWebKit/)
  )
}

function browserDownload({ url, filename }: DownloadFile) {
  if (document) {
    const link = document.createElement('a')
    link.href = url
    // taget=_blank does not work on ios safari and will cause the download to be
    // unresponsive.
    if (!isMobileSafari()) {
      link.target = '_blank'
    }
    link.download = filename ?? ''
    link.click()
    link.remove()
  } else {
    throw new Error('No document found')
  }
}

class TrackDownload extends TrackDownloadBase {
  async downloadTracks({
    files,
    rootDirectoryName,
    abortSignal,
    dispatch
  }: DownloadTrackArgs) {
    if (files.length === 0) return

    dispatch(beginDownload())

    dedupFilenames(files)
    try {
      const results = await Promise.allSettled(
        files.map(({ url }) => window.fetch(url, { signal: abortSignal }))
      )

      // `allSettled` swallows the abort rejection, so check for it explicitly
      // and rethrow in the shape the catch below expects.
      if (abortSignal?.aborted) {
        const abortError = new Error('Download aborted')
        abortError.name = 'AbortError'
        throw abortError
      }

      // Download whatever is actually available rather than failing the whole
      // batch on one bad file. A single unavailable track — most commonly a
      // parent whose `is_downloadable` is false, whose download URL 404s —
      // used to take every other file down with it.
      const available: { file: DownloadFile; response: Response }[] = []
      const skipped: string[] = []

      results.forEach((result, i) => {
        const file = files[i]
        if (result.status === 'fulfilled' && result.value.ok) {
          available.push({ file, response: result.value })
        } else {
          const reason =
            result.status === 'fulfilled'
              ? `HTTP ${result.value.status}`
              : ((result.reason as Error)?.message ?? 'request failed')
          skipped.push(`${file.filename} (${reason})`)
        }
      })

      if (skipped.length > 0) {
        console.warn(
          `Skipping ${skipped.length} of ${files.length} unavailable file(s) during download: ${skipped.join(', ')}`
        )
      }

      // Only a batch where nothing at all could be fetched is a failure.
      if (available.length === 0) {
        throw new Error('Download unsuccessful')
      }

      const filename = rootDirectoryName ?? available[0].file.filename
      let url
      if (available.length === 1) {
        url = available[0].response.url
      } else {
        if (!rootDirectoryName)
          throw new Error(
            'rootDirectory must be supplied when downloading multiple files'
          )
        const blob = await downloadZip(
          available.map(({ file, response }) => {
            return {
              name: rootDirectoryName + '/' + file.filename,
              input: response
            }
          })
        ).blob()
        url = URL.createObjectURL(blob)
      }
      browserDownload({ url, filename })
      dispatch(downloadFinished())

      // Track download success event
      const eventName =
        available.length === 1
          ? Name.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_SINGLE
          : Name.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_ALL
      trackEvent(eventName, { device: 'web' })
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.info('Download aborted by the user')
      } else {
        dispatch(
          setDownloadError(
            e instanceof Error ? e : new Error(`Download failed: ${e}`)
          )
        )

        // Track download failure event
        const eventName =
          files.length === 1
            ? Name.TRACK_DOWNLOAD_FAILED_DOWNLOAD_SINGLE
            : Name.TRACK_DOWNLOAD_FAILED_DOWNLOAD_ALL
        trackEvent(eventName, { device: 'web' })

        throw e
      }
    }
  }
}

export const trackDownload = new TrackDownload()
