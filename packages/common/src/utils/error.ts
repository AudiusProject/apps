import { ResponseError } from '@audius/sdk'

type ErrorWithMessage = {
  name: string
  message: string
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError))
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message
}

export const isResponseError = (error: unknown): error is ResponseError =>
  error instanceof Error && error.name === 'ResponseError'

/** Max characters of response body to capture for analytics. */
const RESPONSE_BODY_ANALYTICS_LIMIT = 500

export type ResponseErrorAnalyticsFields = {
  errorName?: string
  httpStatus?: number
  httpStatusText?: string
  responseBody?: string
}

/**
 * If `error` is a SDK `ResponseError`, returns analytics fields with HTTP
 * status, status text, and a truncated response body so failures can be
 * diagnosed from telemetry. The default `error.message` for these is the
 * SDK's generic "Response returned an error code", which on its own is
 * useless for triage.
 *
 * Safe to call with any error — returns `{}` for non-ResponseError values
 * and swallows any read errors. Body read uses `response.clone()` so it
 * does not interfere with other consumers of the response.
 */
export const getResponseErrorAnalyticsFields = async (
  error: unknown
): Promise<ResponseErrorAnalyticsFields> => {
  if (!isResponseError(error)) return {}
  const fields: ResponseErrorAnalyticsFields = { errorName: error.name }
  const { response } = error
  if (!response) return fields
  fields.httpStatus = response.status
  fields.httpStatusText = response.statusText
  try {
    const text = await response.clone().text()
    if (text) {
      fields.responseBody =
        text.length > RESPONSE_BODY_ANALYTICS_LIMIT
          ? `${text.slice(0, RESPONSE_BODY_ANALYTICS_LIMIT)}…[truncated]`
          : text
    }
  } catch {
    // Body unavailable (already consumed, network error, etc.) — best effort.
  }
  return fields
}
