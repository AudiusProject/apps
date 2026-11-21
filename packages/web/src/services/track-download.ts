import {
  DownloadFile,
  TrackDownload as TrackDownloadBase,
  type DownloadTrackArgs
} from '@audius/common/services'
import { tracksSocialActions, downloadsActions } from '@audius/common/store'
import { dedupFilenames } from '@audius/common/utils'
import { downloadZip } from 'client-zip'

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

      if (abortSignal?.aborted) {
        const abortError = new Error('Download aborted')
        abortError.name = 'AbortError'
        throw abortError
      }

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
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        console.info('Download aborted by the user')
      } else {
        dispatch(
          setDownloadError(
            e instanceof Error ? e : new Error(`Download failed: ${e}`)
          )
        )

        throw e
      }
    }
  }
}

export const trackDownload = new TrackDownload()
