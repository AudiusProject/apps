import { useState, useCallback, useMemo } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { FormikHelpers } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useQueryContext } from '~/api/tan-query/utils'
import { confirmEmailSchema, emailSchema } from '~/schemas'

import { isOtpMissingError } from './useChangePasswordFormConfiguration'

// Note: Not an SDK RequestError as it comes from Hedgehog
const INVALID_CREDENTIALS_ERROR = 'Invalid credentials'
const isInvalidCredentialsError = (e: unknown) => {
  return (
    e instanceof Error &&
    'response' in e &&
    e.response instanceof Object &&
    'data' in e.response &&
    e.response.data instanceof Object &&
    'error' in e.response.data &&
    e.response.data.error === INVALID_CREDENTIALS_ERROR
  )
}

const messages = {
  invalidCredentials: 'Invalid credentials.',
  somethingWrong: 'Something went wrong.',
  passwordRequired: 'Please enter a password.',
  emailUpdated: 'Email updated!'
}

export enum ChangeEmailPage {
  ConfirmPassword = 0,
  NewEmail = 1,
  VerifyEmail = 2
}

export type ChangeEmailFormValues = {
  email: string
  oldEmail: string
  password: string
  otp: string
}

const initialValues: ChangeEmailFormValues = {
  email: '',
  oldEmail: '',
  password: '',
  otp: ''
}

export const useChangeEmailFormConfiguration = (onComplete: () => void) => {
  const [page, setPage] = useState(ChangeEmailPage.ConfirmPassword)
  const queryContext = useQueryContext()
  const { authService } = queryContext
  const queryClient = useQueryClient()

  // Move schema initializations inside the hook to prevent initialization timing issues
  const confirmPasswordFormikSchema = toFormikValidationSchema(
    z.object({
      password: z.string({
        required_error: messages.passwordRequired
      })
    })
  )
  const verifyEmailFormikSchema = toFormikValidationSchema(confirmEmailSchema)

  const EmailSchema = useMemo(
    () => toFormikValidationSchema(emailSchema(queryContext, queryClient)),
    [queryContext, queryClient]
  )

  const validationSchema =
    page === ChangeEmailPage.ConfirmPassword
      ? confirmPasswordFormikSchema
      : page === ChangeEmailPage.NewEmail
        ? EmailSchema
        : page === ChangeEmailPage.VerifyEmail
          ? verifyEmailFormikSchema
          : undefined

  const checkPassword = useCallback(
    async (
      values: ChangeEmailFormValues,
      helpers: FormikHelpers<ChangeEmailFormValues>
    ) => {
      const { oldEmail, password } = values
      try {
        const confirmed = await authService.confirmCredentials({
          username: oldEmail,
          password,
          softCheck: true
        })
        if (confirmed) {
          helpers.setFieldTouched('email', false)
          setPage(ChangeEmailPage.NewEmail)
        } else {
          helpers.setFieldError('password', messages.invalidCredentials)
        }
      } catch (e) {
        helpers.setFieldError('password', messages.invalidCredentials)
      }
    },
    [setPage, authService]
  )

  const changeEmail = useCallback(
    async (
      values: ChangeEmailFormValues,
      helpers: FormikHelpers<ChangeEmailFormValues>
    ) => {
      const { oldEmail, password, email, otp } = values
      const sanitizedOtp = otp.replace(/\s/g, '')

      try {
        await authService.changeCredentials({
          newUsername: email,
          newPassword: password,
          oldUsername: oldEmail,
          oldPassword: password,
          otp: sanitizedOtp,
          email
        })
        onComplete()
      } catch (e) {
        console.warn(e)
        if (isOtpMissingError(e)) {
          helpers.setFieldTouched('otp', false)
          setPage(ChangeEmailPage.VerifyEmail)
        } else if (isInvalidCredentialsError(e)) {
          helpers.setFieldError('otp', messages.invalidCredentials)
          helpers.setFieldError('email', messages.somethingWrong)
        } else {
          helpers.setFieldError('otp', messages.somethingWrong)
          helpers.setFieldError('email', messages.somethingWrong)
          console.error('ChangeEmail', e as Error)
        }
      }
    },
    [setPage, onComplete, authService]
  )

  const onSubmit = useCallback(
    async (
      values: ChangeEmailFormValues,
      helpers: FormikHelpers<ChangeEmailFormValues>
    ) => {
      if (page === ChangeEmailPage.ConfirmPassword) {
        await checkPassword(values, helpers)
      } else if (page === ChangeEmailPage.VerifyEmail) {
        await changeEmail(values, helpers)
      } else {
        await changeEmail(values, helpers)
      }
    },
    [page, changeEmail, checkPassword]
  )

  return {
    initialValues,
    validateOnChange: false,
    validationSchema,
    onSubmit,
    page,
    setPage
  }
}
