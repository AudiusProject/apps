import { ErrorLevel } from '@audius/common/models'
import type { ReportToSentryArgs } from '@audius/common/models'
import { getErrorMessage, isResponseError } from '@audius/common/utils'

type ConsoleLoggingMethod = keyof Pick<
  Console,
  'log' | 'warn' | 'error' | 'info' | 'debug'
>

const jsLoggerMapping: { [level in ErrorLevel]: ConsoleLoggingMethod } = {
  Warning: 'warn',
  Fatal: 'error',
  Debug: 'debug',
  Error: 'error',
  Info: 'info',
  Log: 'log'
}

/**
 * Helper fn that logs errors to console
 * Note: Sentry has been removed from mobile
 */
export const reportToSentry = async ({
  level = ErrorLevel.Error,
  additionalInfo,
  error,
  tags,
  name,
  feature
}: ReportToSentryArgs) => {
  try {
    let enrichedAdditionalInfo = additionalInfo

    if (isResponseError(error)) {
      const responseBody =
        (await error.response.json().catch()) ??
        (await error.response.text().catch())
      enrichedAdditionalInfo = {
        ...additionalInfo,
        response: error.response,
        requestId: error.response.headers.get('X-Request-ID'),
        responseBody
      }
    }

    if (name) {
      error.name = `${name}: ${error.name}`
    }

    // Call JS console method using the specified level
    const consoleMethod =
      jsLoggerMapping[level || ErrorLevel.Log] || jsLoggerMapping.Log
    // eslint-disable-next-line no-console
    console[consoleMethod](error, 'More info in console.debug')
    if (enrichedAdditionalInfo || tags || feature) {
      console.debug('Additional error info:', {
        additionalInfo: enrichedAdditionalInfo,
        tags,
        feature,
        level
      })
    }
  } catch (err) {
    console.error(`Got error trying to log error: ${getErrorMessage(err)}`)
  }
}
