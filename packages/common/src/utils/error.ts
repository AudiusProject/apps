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
    return new Error(String(maybeError))
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message
}

export const isResponseError = (error: unknown): error is ResponseError =>
  error instanceof Error && error.name === 'ResponseError'

const RESPONSE_BODY_ANALYTICS_LIMIT = 500

export type ResponseErrorAnalyticsFields = {
  errorName?: string
  httpStatus?: number
  httpStatusText?: string
  responseBody?: string
}

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
