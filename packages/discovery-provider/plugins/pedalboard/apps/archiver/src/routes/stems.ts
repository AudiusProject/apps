import express from 'express'
import { MESSAGE_HEADER, SIGNATURE_HEADER } from '../constants'
import {
  JobStatus,
  getOrCreateStemsArchiveJob,
  getStemsArchiveJob
} from '../jobs/createStemsArchive'
import { logger } from '../logger'
import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import { basename } from 'path'
import { OptionalHashId } from '@audius/sdk/services'
import { queryParamToBoolean } from './utils'

const removeInternalStatusFields = (jobStatus: JobStatus) => {
  // Don't return the job returnvalue to the client, that's used internally
  const { returnvalue: _, ...rest } = jobStatus
  return rest
}

export const stemsRouter = ({
  removeStemsArchiveJob,
  cancelStemsArchiveJob
}: {
  removeStemsArchiveJob: (jobId: string) => Promise<void>
  cancelStemsArchiveJob: (jobId: string) => Promise<void>
}) => {
  const router = express.Router()
  router.post('/:trackId', async (req, res) => {
    try {
      const { trackId: trackIdString } = req.params
      const trackId = OptionalHashId.parse(trackIdString)
      const userId = OptionalHashId.parse(req.query.user_id)
      const messageHeader = req.header(MESSAGE_HEADER)
      const signatureHeader = req.header(SIGNATURE_HEADER)
      const includeParentTrack = queryParamToBoolean(req.query.include_parent)

      if (!userId || !trackId || !messageHeader || !signatureHeader) {
        return res.status(400).json({
          error: 'Missing required parameters'
        })
      }

      const jobStatus = await getOrCreateStemsArchiveJob({
        trackId,
        userId: userId,
        messageHeader,
        signatureHeader,
        includeParentTrack
      })

      res.status(200).json(removeInternalStatusFields(jobStatus))
    } catch (error) {
      logger.error({ error }, 'Failed to create stems archive job')
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.get('/job/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params
      const job = await getStemsArchiveJob(jobId)

      if (!job) {
        return res.status(404).json({ error: 'Job not found' })
      }

      res.status(200).json(removeInternalStatusFields(job))
    } catch (error) {
      logger.error({ error }, 'Failed to get stems archive job')
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  router.delete('/job/:jobId', async (req, res) => {
    const { jobId } = req.params
    try {
      await cancelStemsArchiveJob(jobId)
    } catch (error) {
      logger.error({ error }, 'Failed to cancel stems archive job')
    } finally {
      // This endpoint is best effort, so we don't want to fail the request
      // The job will eventually be orphaned and cleaned up
      res.status(204).send()
    }
  })

  router.get('/download/:jobId', async (req, res) => {
    const { jobId } = req.params
    try {
      const job = await getStemsArchiveJob(jobId)

      if (!job) {
        return res.status(404).json({ error: 'Job not found' })
      }

      if (job.state !== 'completed') {
        return res.status(400).json({ error: 'Job is not completed' })
      }

      const { returnvalue } = job
      if (!returnvalue) {
        return res.status(400).json({ error: 'Job has no return value' })
      }

      const { outputFile } = returnvalue
      const filename = basename(outputFile)

      const stats = await stat(outputFile)

      res.setHeader('Content-Type', 'application/zip')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Length', stats.size)

      // Set up cleanup after download finishes
      res.on('finish', async () => {
        try {
          await removeStemsArchiveJob(jobId)
        } catch (error) {
          logger.error(
            { error, jobId },
            'Failed to clean up stems archive after download'
          )
        }
      })

      createReadStream(outputFile)
        .on('error', (error) => {
          logger.error({ error, jobId }, 'Failed to stream archive file')
          if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to stream archive file' })
          }
        })
        .pipe(res)
    } catch (error) {
      logger.error({ error }, 'Failed to get stems archive')
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  })

  return router
}
