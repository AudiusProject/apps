import { Name } from '@audius/common/models'
import {
  DownloadFile,
  TrackDownload as TrackDownloadBase,
  type DownloadTrackArgs
} from '@audius/common/services'
import { tracksSocialActions, downloadsActions } from '@audius/common/store'
import { dedupFilenames } from '@audius/common/utils'

import { track as trackEvent } from './analytics/amplitude'

const { downloadFinished } = tracksSocialActions

const { beginDownload, setDownloadError } = downloadsActions

// Gap between successive anchor clicks when downloading a batch. Chrome
// coalesces rapid programmatic downloads from one origin into a single
// "Download multiple files?" permission prompt, but only if they arrive as a
// recognizable burst; firing them in the same tick makes it drop all but the
// first, and spacing them out too far makes it prompt repeatedly.
const MULTI_DOWNLOAD_STAGGER_MS = 300

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

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

class TrackDownload extends TrackDownloadBase {
  /**
   * Hands each file to the browser as its own download rather than bundling
   * them into an archive.
   *
   * This used to fetch every file into memory and zip it client-side (and,
   * for "Download All", delegate to the server-side archiver service). Both
   * were unstable for the sets that matter most — a contest track carries
   * dozens of lossless stems totalling multiple GB, WAV barely compresses, so
   * the zip was pure overhead on top of a fragile job queue that routinely
   * stranded users on a spinner.
   *
   * Individual downloads have neither problem: the browser streams each file
   * straight to disk with its own progress and resume behavior, nothing is
   * buffered in the tab, and there is no job to stall. The tradeoff is the
   * one-time "Download multiple files?" permission prompt, which is the UX
   * we're deliberately opting into.
   *
   * Filenames come from the server. `link.download` is ignored on
   * cross-origin URLs, but these URLs point at api.audius.co, which redirects
   * to a content node that sets `Content-Disposition: attachment` carrying
   * the `filename` query param the download saga already signs into the URL.
   */
  async downloadTracks({ files, abortSignal, dispatch }: DownloadTrackArgs) {
    if (files.length === 0) {
      dispatch(setDownloadError(new Error('No downloadable files found')))
      return
    }

    dispatch(beginDownload())

    dedupFilenames(files)
    try {
      for (const [i, file] of files.entries()) {
        if (abortSignal?.aborted) {
          const abortError = new Error('Download aborted')
          abortError.name = 'AbortError'
          throw abortError
        }
        browserDownload(file)
        if (i < files.length - 1) {
          await delay(MULTI_DOWNLOAD_STAGGER_MS)
        }
      }

      dispatch(downloadFinished())

      const eventName =
        files.length === 1
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
