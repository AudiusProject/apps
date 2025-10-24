import { Worker, Job, UnrecoverableError, WorkerListener } from 'bullmq'
import {
  StemsArchiveJobData,
  StemsArchiveJobResult,
  getStemsArchiveQueue
} from '../../jobs/createStemsArchive'
import { OptionalId } from '@audius/sdk'
import {
  MESSAGE_HEADER,
  SIGNATURE_HEADER,
  STEMS_ARCHIVE_QUEUE_NAME
} from '../../constants'
import path from 'path'
import { WorkerServices } from '../services'
import { createUtils } from './utils'
import fetch from 'node-fetch'

type StemsArchiveWorkerListener = WorkerListener<
  StemsArchiveJobData,
  StemsArchiveJobResult
>

const getRedirectUrl = async (url: string) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual'
    })

    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get('Location')
      return redirectUrl ?? url
    } else {
      return url
    }
  } catch (error) {
    throw new Error(`Fetch failed: ${(error as Error).message}`)
  }
}

export const createStemsArchiveWorker = (services: WorkerServices) => {
  const { config, spaceManager, fs, sdk } = services
  const workerLogger = services.logger.child({
    worker: 'createStemsArchive'
  })
  const { createArchive, downloadFile, fileExists, removeTempFiles } =
    createUtils(services)

  const abortControllers = new Map<string, AbortController>()

  const processJob = async (
    job: Job<StemsArchiveJobData>
  ): Promise<StemsArchiveJobResult> => {
    const {
      jobId,
      trackId,
      userId,
      messageHeader,
      signatureHeader,
      includeParentTrack
    } = job.data

    const logger = workerLogger.child({
      jobId,
      trackId,
      userId,
      includeParentTrack
    })

    const abortController = new AbortController()
    abortControllers.set(jobId, abortController)

    const sdkRequestInit = {
      signal: abortController.signal,
      headers: {
        [MESSAGE_HEADER]: messageHeader,
        [SIGNATURE_HEADER]: signatureHeader
      }
    }

    try {
      logger.info('Starting stems archive creation job')

      const hashedTrackId = OptionalId.parse(trackId)
      const hashedUserId = OptionalId.parse(userId)

      if (!hashedTrackId) {
        throw new UnrecoverableError(`Failed to encode track Id: ${trackId}`)
      }
      if (!hashedUserId) {
        throw new UnrecoverableError(`No userID provided`)
      }
      if (!signatureHeader) {
        throw new UnrecoverableError(`Missing signature header`)
      }
      if (!messageHeader) {
        throw new UnrecoverableError(`Missing message header`)
      }

      const { data: track } = await sdk.tracks.getTrack(
        {
          trackId: hashedTrackId
        },
        sdkRequestInit
      )

      if (!track) {
        throw new Error('Track details not found')
      }

      logger.debug('Getting track stems')
      const { data: stems = [] } = await sdk.tracks.getTrackStems(
        {
          trackId: hashedTrackId
        },
        sdkRequestInit
      )

      if (stems.length === 0) {
        throw new Error('No stems found for track')
      }

      const filesToDownload =
        includeParentTrack && track.isDownloadable
          ? [
              ...stems,
              { ...track, origFilename: track.origFilename ?? track.title }
            ]
          : stems

      logger.debug({ files: filesToDownload }, 'Getting file sizes')

      // Check file sizes before downloading
      const fileSizes = await Promise.all(
        filesToDownload.map(async (file) => {
          const inspection = await sdk.tracks.inspectTrack(
            {
              trackId: file.id,
              original: true
            },
            sdkRequestInit
          )
          if (!inspection.data?.size) {
            throw new Error(`File size not found for ${file.id}`)
          }
          return inspection.data.size
        })
      )

      const totalSizeBytes = fileSizes.reduce((sum, size) => sum + size, 0)
      logger.debug({ totalSizeBytes }, 'Calculated required disk space')

      logger.debug({ stems }, 'Downloading stems')

      await spaceManager.waitForSpace({
        token: jobId,
        bytes: totalSizeBytes,
        timeoutSeconds: config.maxDiskSpaceWaitSeconds,
        signal: abortController.signal
      })

      // Create job-specific temp directory
      const jobTempDir = path.join(config.archiverTmpDir, jobId)
      if (!(await fileExists(jobTempDir))) {
        await fs.mkdir(jobTempDir, { recursive: true })
      }

      // Download each stem
      const downloadedFiles = await Promise.all(
        filesToDownload.map(async (stem) => {
          let url

          const downloadUrl = await sdk.tracks.getTrackDownloadUrl({
            trackId: stem.id,
            userId: hashedUserId,
            userSignature: signatureHeader,
            userData: messageHeader,
            filename: stem.origFilename
          })

          if (config.environment === 'prod') {
            url = downloadUrl
            const redirectUrl = await getRedirectUrl(downloadUrl)
            const modifiedUrl = new URL(redirectUrl)
            modifiedUrl.host = 'creatornode2.audius.co'
            url = modifiedUrl.toString()
          } else {
            url = downloadUrl
          }

          const filePath = path.join(jobTempDir, stem.origFilename)
          return downloadFile({
            url,
            filePath,
            jobId,
            signal: abortController.signal
          })
        })
      )

      logger.debug(
        { files: downloadedFiles },
        'Successfully downloaded all stems'
      )

      logger.debug({ files: downloadedFiles }, 'Creating archive')
      // Create archive from downloaded files
      const outputFile = await createArchive({
        files: downloadedFiles,
        jobId,
        archiveName: `${track.title}.zip`,
        signal: abortController.signal
      })

      // Clean up temp files except the output archive
      for (const file of downloadedFiles) {
        if (file !== outputFile && (await fileExists(file))) {
          await fs.unlink(file)
        }
      }

      logger.info({ outputFile }, 'Successfully created stems archive')

      return { outputFile }
    } catch (error) {
      try {
        logger.error({ error }, 'Job failed, cleaning up temp files')
        await removeTempFiles(jobId)
        await spaceManager.releaseSpace(jobId)
      } catch (error) {
        logger.error({ error }, 'Error cleaning up while handling job failure')
      }

      if (abortController.signal.aborted) {
        logger.info('Job aborted')
        throw new UnrecoverableError('Job aborted')
      }

      throw error
    } finally {
      abortControllers.delete(jobId)
    }
  }

  const removeStemsArchiveJob = async (jobId: string) => {
    workerLogger.info({ jobId }, 'Removing stems archive job')
    const queue = getStemsArchiveQueue()
    try {
      await removeTempFiles(jobId)
      await spaceManager.releaseSpace(jobId)
      workerLogger.info({ jobId }, 'Removed stems archive job')
    } catch (error) {
      workerLogger.error({ error, jobId }, 'Failed to clean up stems archive')
      throw error
    } finally {
      await queue.remove(jobId)
    }
  }

  const cancelStemsArchiveJob = async (jobId: string) => {
    workerLogger.info({ jobId }, 'Cancelling stems archive job')
    const job = await getStemsArchiveQueue().getJob(jobId)
    if (job && (await job.isCompleted())) {
      try {
        await removeStemsArchiveJob(jobId)
      } finally {
        await job.remove()
      }
    } else if (abortControllers.has(jobId)) {
      const abortController = abortControllers.get(jobId)
      abortController?.abort()
    } else {
      workerLogger.info({ jobId }, 'Stems archive job not found')
    }
  }

  // Abort all active jobs when the worker is closing
  const onClosing: StemsArchiveWorkerListener['closing'] = () => {
    workerLogger.info('Worker closing, aborting all active jobs')
    for (const abortController of abortControllers.values()) {
      abortController.abort()
    }
  }

  return {
    processJob,
    onClosing,
    removeStemsArchiveJob,
    cancelStemsArchiveJob
  }
}

export const startStemsArchiveWorker = (services: WorkerServices) => {
  const {
    processJob,
    onClosing,
    removeStemsArchiveJob,
    cancelStemsArchiveJob
  } = createStemsArchiveWorker(services)

  const worker = new Worker<StemsArchiveJobData, StemsArchiveJobResult>(
    STEMS_ARCHIVE_QUEUE_NAME,
    processJob,
    {
      connection: {
        url: services.config.redisUrl
      },
      concurrency: services.config.concurrentJobs
    }
  )

  worker.on('closing', onClosing)

  return { worker, removeStemsArchiveJob, cancelStemsArchiveJob }
}
