import axios from 'axios'

import type { LoggerService } from '../Logger'

export const isNodeHealthy = async (
  endpoint: string,
  logger: Pick<LoggerService, 'warn' | 'error'> = console
) => {
  try {
    const resp = await axios({
      baseURL: endpoint,
      url: `/health_check`,
      method: 'get',
      timeout: 10_000
    })
    if (resp.status !== 200) {
      logger.warn(
        `isNodeHealthy: ${endpoint} returned non-200 status ${resp.status}`
      )
      return false
    }

    // check has space + not slow
    const health = resp.data.data

    // skip nodes if avg transcode time is over 3 minutes
    const avgTranscodeTime = health.transcodeStats?.AvgTranscodeTime || 0
    const isSlowTranscode = avgTranscodeTime > 180
    return health.diskHasSpace && !isSlowTranscode
  } catch (e) {
    logger.error(`isNodeHealthy: Error checking health: ${e}`)
    return false
  }
}
