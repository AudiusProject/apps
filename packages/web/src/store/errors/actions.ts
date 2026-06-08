export const HANDLE_ERROR = 'ERROR/HANDLE_ERROR'
export const OPEN_ERROR_PAGE = 'ERROR/OPEN_ERROR_PAGE'
export const CLOSE_ERROR_PAGE = 'ERROR/CLOSE_ERROR_PAGE'

export enum UiErrorCode {
  UNKNOWN,
  RELAY_BLOCKED
}

export type HandleErrorAction = {
  type: typeof HANDLE_ERROR
  name?: string
  message: string
  shouldReport: boolean
  shouldRedirect: boolean
  // by default the handler redirects to the error page if
  // shouldRedirect is true unless a redirectRoute is passed in
  shouldToast?: boolean

  additionalInfo?: Record<string, unknown>
  uiErrorCode: UiErrorCode
}

export type OpenErrorPageAction = {
  type: typeof OPEN_ERROR_PAGE
}

export type CloseErrorPageAction = {
  type: typeof CLOSE_ERROR_PAGE
}

export type HandleErrorArgs = {
  shouldRedirect: boolean
  shouldReport?: boolean
  shouldToast?: boolean
  message: string
  name?: string
  additionalInfo?: Record<string, unknown>
  uiErrorCode?: UiErrorCode
}

export const handleError = ({
  name,
  message,
  shouldReport = true,
  shouldRedirect,
  shouldToast,
  additionalInfo = {},
  uiErrorCode = UiErrorCode.UNKNOWN
}: HandleErrorArgs): HandleErrorAction => ({
  type: HANDLE_ERROR,
  name,
  message,
  shouldRedirect,
  shouldReport,
  shouldToast,
  additionalInfo,
  uiErrorCode
})

export const openErrorPage = (): OpenErrorPageAction => ({
  type: OPEN_ERROR_PAGE
})

export const closeErrorPage = (): CloseErrorPageAction => ({
  type: CLOSE_ERROR_PAGE
})
