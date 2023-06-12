import type { Job, Queue, Worker } from 'bullmq'

import {
  NAMESPACE_PREFIX,
  METRICS,
  METRIC_NAMES,
  QUEUE_INTERVAL
} from './prometheus.constants'
import * as PrometheusClient from 'prom-client'

/**
 * See `prometheusMonitoring/README.md` for usage details
 */

enum JOB_STATUS {
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export class PrometheusRegistry {
  registry: any
  metricNames: Record<string, string>
  namespacePrefix: string

  public constructor() {
    // Use default global registry to register metrics
    this.registry = PrometheusClient.register

    // Ensure clean state for registry
    this.registry.clear()

    // Enable collection of default metrics (e.g. heap, cpu, event loop)
    PrometheusClient.collectDefaultMetrics({
      prefix: NAMESPACE_PREFIX + '_default_'
    })

    this.initStaticMetrics(this.registry)

    // Expose metric names from class for access throughout application
    this.metricNames = { ...METRIC_NAMES }

    this.namespacePrefix = NAMESPACE_PREFIX
  }

  /**
   * Creates and registers every static metric defined in prometheus.constants.js
   */
  public initStaticMetrics(registry: any) {
    for (const { metricType, metricConfig } of Object.values(METRICS)) {
      // Create and register instance of MetricType, with provided metricConfig

      // eslint-disable-next-line new-cap
      const metric = new metricType(metricConfig)
      registry.registerMetric(metric)
    }
  }

  /** Getters */

  /** Returns current data for all metrics */
  public async getAllMetricData() {
    return this.registry.metrics()
  }

  /** Returns single metric instance by name */
  public getMetric(name: string) {
    return this.registry.getSingleMetric(name)
  }

  public recordJobMetrics(
    labels: { [key: string]: string },
    status: JOB_STATUS,
    job: Job
  ) {
    if (!job.finishedOn) {
      return
    }

    const jobLabels = {
      status,
      ...labels
    }

    // job duration in seconds
    const jobDuration = (job.finishedOn - job.processedOn!) / 1000
    this.getMetric(this.metricNames.JOBS_DURATION_SECONDS_HISTOGRAM).observe(
      jobLabels,
      jobDuration
    )

    // job duration in seconds
    const waitingDuration = (job.processedOn! - job.timestamp) / 1000
    this.getMetric(
      this.metricNames.JOBS_WAITING_DURATION_SECONDS_HISTOGRAM
    ).observe(jobLabels, waitingDuration)

    this.getMetric(this.metricNames.JOBS_ATTEMPTS_HISTOGRAM).observe(
      jobLabels,
      job.attemptsMade
    )
  }

  /**
   * @param queue the bull queue to collect metrics on
   * @param worker the bull worker to collect metrics on
   *
   * This function is used to collect prometheus metrics on bull queues
   * by registering callbacks when jobs fail, wait, or complete
   */
  public startQueueMetrics(queue: Queue, worker: Worker) {
    const labels = {
      queue_name: queue.name
    }

    worker.on('completed', (job: Job, _result: any, _prev: string) => {
      const job_name = job?.data?.task || job.name
      this.recordJobMetrics({ job_name, ...labels }, JOB_STATUS.COMPLETED, job)
    })
    worker.on('failed', (job: Job, _error: Error, _prev: string) => {
      const job_name = job?.data?.task || job.name
      this.recordJobMetrics({ job_name, ...labels }, JOB_STATUS.FAILED, job)
    })

    const metricInterval = setInterval(() => {
      queue
        .getJobCounts('completed', 'failed', 'delayed', 'active', 'waiting')
        .then(({ completed, failed, delayed, active, waiting }) => {
          this.getMetric(this.metricNames.JOBS_COMPLETED_TOTAL_GAUGE).set(
            labels,
            completed || 0
          )
          this.getMetric(this.metricNames.JOBS_FAILED_TOTAL_GAUGE).set(
            labels,
            failed || 0
          )
          this.getMetric(this.metricNames.JOBS_DELAYED_TOTAL_GAUGE).set(
            labels,
            delayed || 0
          )
          this.getMetric(this.metricNames.JOBS_ACTIVE_TOTAL_GAUGE).set(
            labels,
            active || 0
          )
          this.getMetric(this.metricNames.JOBS_WAITING_TOTAL_GAUGE).set(
            labels,
            waiting || 0
          )

          return null
        })
        .catch((_) => {})
    }, QUEUE_INTERVAL)

    return {
      stop: () => clearInterval(metricInterval)
    }
  }
}

module.exports = PrometheusRegistry
