import type { PrometheusRegistry } from './services/prometheusMonitoring/prometheusRegistry'

import { Queue, QueueEvents, Worker } from 'bullmq'
import path from 'path'
import os from 'os'

import config from './config'
import { logger as genericLogger } from './logging'
import { clusterUtils } from './utils'

const imageProcessingMaxConcurrency = config.get(
  'imageProcessingMaxConcurrency'
)

enum ProcessNames {
  resizeImage = 'resizeImage'
}

// Maximum concurrency set to config var if provided
// Otherwise, uses the number of CPU cores available to node
const MAX_CONCURRENCY =
  imageProcessingMaxConcurrency !== -1
    ? imageProcessingMaxConcurrency
    : os.cpus().length

const IMAGE_PROCESSING_QUEUE_HISTORY = 500

export class ImageProcessingQueue {
  queue: Queue<any, any, string>
  queueEvents: QueueEvents

  constructor(prometheusRegistry: PrometheusRegistry | null = null) {
    const connection = {
      host: config.get('redisHost'),
      port: config.get('redisPort')
    }
    this.queue = new Queue('image-processing-queue', {
      connection,
      defaultJobOptions: {
        removeOnComplete: IMAGE_PROCESSING_QUEUE_HISTORY,
        removeOnFail: IMAGE_PROCESSING_QUEUE_HISTORY
      }
    })

    // Process jobs sandboxed - https://docs.bullmq.io/guide/workers/sandboxed-processors
    const processorFile = path.join(__dirname, 'resizeImage.js')
    const worker = new Worker('image-processing-queue', processorFile, {
      connection,
      concurrency: clusterUtils.getConcurrencyPerWorker(MAX_CONCURRENCY)
    })
    if (prometheusRegistry !== null && prometheusRegistry !== undefined) {
      prometheusRegistry.startQueueMetrics(this.queue, worker)
    }

    this.logStatus = this.logStatus.bind(this)
    this.resizeImage = this.resizeImage.bind(this)

    this.queueEvents = new QueueEvents('image-processing-queue', {
      connection
    })
  }

  /**
   * Logs a status message and includes current queue info
   * @param {object} logContext to create a logger.child(logContext) from
   * @param {string} message
   */
  async logStatus(logContext: Object, message: string) {
    const logger = genericLogger.child(logContext)
    const count = await this.queue.count()
    logger.info(`Image Processing Queue: ${message}`)
    logger.info(`Image Processing Queue: count: ${count}`)
  }

  /**
   * Resizes a given image into the options provided and
   * writes the results to file storage
   * @param {string} path to the image file
   * @param {string} fileName name of the original file
   * @param {object<string, number>} sizes
   * @param {string} sizes.key the name of the sized file e.g. 150x150.jpg
   * @param {number} sizes.value the maxWidth resize the image to, e.g. 1000
   * @param {boolean} square whether or not to "square" the image when resizing
   * @param {object} logContext the req.logContext
   *
   * @return {object} { dir, files }
   *   dir: {
   *     dirCID: string
   *     dirDestPath: string
   *   }
   *   files: [
   *     {
   *       multihash: string
   *       sourceFile: string
   *       storagePath: string
   *     }
   *   ]
   */
  public async resizeImage({
    file,
    fileName,
    sizes,
    square,
    logContext
  }: {
    file: any
    fileName: string
    sizes: Record<string, number>
    square: boolean
    logContext: Object
  }) {
    const job = await this.queue.add(ProcessNames.resizeImage, {
      file,
      fileName,
      sizes,
      square,
      logContext
    })

    const result = await job.waitUntilFinished(this.queueEvents)
    return result
  }
}

module.exports = { ImageProcessingQueue }
