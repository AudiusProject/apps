export const CHANGE_PASSWORD = 'PASSWORD_RESET/CHANGE_PASSWORD'
export const CHANGE_PASSWORD_SUCCEEDED =
  'PASSWORD_RESET/CHANGE_PASSWORD_SUCCEEDED'
export const CHANGE_PASSWORD_FAILED = 'PASSWORD_RESET/CHANGE_PASSWORD_FAILED'

export type ChangePasswordAction = {
  type: typeof CHANGE_PASSWORD
  email: string
  password: string
  lookupKey?: string
}

export type ChangePasswordSucceededAction = {
  type: typeof CHANGE_PASSWORD_SUCCEEDED
}

export type ChangePasswordFailedAction = {
  type: typeof CHANGE_PASSWORD_FAILED
}

export type ChangePasswordActions =
  | ChangePasswordAction
  | ChangePasswordSucceededAction
  | ChangePasswordFailedAction

export const changePassword = (
  email: string,
  password: string,
  lookupKey?: string
): ChangePasswordActions => ({
  type: CHANGE_PASSWORD,
  email,
  password,
  lookupKey
})

export const changePasswordSucceeded = (): ChangePasswordActions => ({
  type: CHANGE_PASSWORD_SUCCEEDED
})

export const changePasswordFailed = (): ChangePasswordActions => ({
  type: CHANGE_PASSWORD_FAILED
})
