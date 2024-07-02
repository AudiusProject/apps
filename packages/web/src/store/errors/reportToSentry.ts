import { ErrorLevel, ReportToSentryArgs } from '@audius/common/models'
import { getErrorMessage } from '@audius/common/utils'
import { ResponseError } from '@audius/sdk'
import { withScope, captureException } from '@sentry/browser'
import type { SeverityLevel } from '@sentry/types'

const Levels: { [level in ErrorLevel]: SeverityLevel } = {
  Warning: 'warning',
  Fatal: 'fatal',
  Debug: 'debug',
  Error: 'error',
  Info: 'info',
  Log: 'log'
}

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

const isResponseError = (error: Error): error is ResponseError =>
  'response' in error && error.response instanceof Response

/**
 * Helper fn that reports to sentry while creating a localized scope to contain additional data
 * Also logs to console with the appropriate level (console.log, console.warn, console.error, etc)
 */
export const reportToSentry = async ({
  level = ErrorLevel.Error,
  additionalInfo,
  error,
  name,
  tags
}: ReportToSentryArgs) => {
  try {
    withScope(async (scope) => {
      if (level) {
        const sentryLevel = Levels[level]
        scope.setLevel(sentryLevel)
      }
      if (isResponseError(error)) {
        const responseBody =
          (await error.response.json().catch()) ??
          (await error.response.text().catch())
        additionalInfo = {
          ...additionalInfo,
          response: error.response,
          requestId: error.response.headers.get('X-Request-ID'),
          responseBody
        }
      }
      if (additionalInfo) {
        scope.setContext('additionalInfo', additionalInfo)
      }
      if (tags) {
        scope.setTags(tags)
      }
      if (name) {
        error.name = `${name}: ${error.name}`
      }
      // Call JS console method using the specified level
      const consoleMethod =
        jsLoggerMapping[level || ErrorLevel.Log] || jsLoggerMapping.Log
      // eslint-disable-next-line no-console
      console[consoleMethod](error, 'More info in console.debug')
      if (additionalInfo || tags) {
        console.debug('Additional error info:', { additionalInfo, tags, level })
      }
      captureException(error)
    })
  } catch (error) {
    console.error(`Got error trying to log error: ${getErrorMessage(error)}`)
  }
}
