import { useState, useCallback } from 'react'

import { FormikHelpers } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useQueryContext } from '~/api/tan-query/utils'

import { confirmEmailSchema, passwordSchema } from '../schemas'

const messages = {
  invalidCredentials: 'Invalid credentials.',
  passwordRequired: 'Please enter a password.',
  accountMatchError: "Account doesn't match the currently signed in user.",
  passwordUpdated: 'Password updated!'
}

export enum ChangePasswordPage {
  ConfirmPassword = 0,
  VerifyEmail = 1,
  NewPassword = 2
}

const OTP_ERROR = 'Missing otp'
export const isOtpMissingError = (e: unknown) => {
  return (
    e instanceof Object &&
    'response' in e &&
    e.response instanceof Object &&
    'data' in e.response &&
    e.response.data instanceof Object &&
    'error' in e.response.data &&
    e.response.data.error === OTP_ERROR
  )
}

const initialValues: ChangePasswordFormValues = {
  oldEmail: '',
  oldPassword: '',
  password: '',
  confirmPassword: '',
  otp: ''
}

export type ChangePasswordFormValues = {
  oldEmail: string
  oldPassword: string
  password: string
  confirmPassword: string
  otp: string
}

export const useChangePasswordFormConfiguration = (onComplete: () => void) => {
  const { authService } = useQueryContext()
  const [page, setPage] = useState(ChangePasswordPage.ConfirmPassword)

  const passwordFormikSchema = toFormikValidationSchema(passwordSchema)
  const confirmPasswordFormikSchema = toFormikValidationSchema(
    z.object({
      password: z.string({
        required_error: messages.passwordRequired
      })
    })
  )
  const verifyEmailFormikSchema = toFormikValidationSchema(confirmEmailSchema)

  const validationSchema =
    page === ChangePasswordPage.NewPassword
      ? passwordFormikSchema
      : page === ChangePasswordPage.ConfirmPassword
        ? confirmPasswordFormikSchema
        : page === ChangePasswordPage.VerifyEmail
          ? verifyEmailFormikSchema
          : undefined

  const confirmCredentials = useCallback(
    async (
      values: ChangePasswordFormValues,
      helpers: FormikHelpers<ChangePasswordFormValues>
    ) => {
      const { oldEmail: email, password, otp } = values
      const sanitizedOtp = otp.replace(/\s/g, '')
      try {
        const confirmed = await authService.confirmCredentials({
          email,
          username: email,
          password,
          otp: sanitizedOtp
        })
        if (confirmed) {
          helpers.resetForm({
            values: { ...values, oldPassword: password, password: '' }
          })
          setPage(ChangePasswordPage.NewPassword)
        } else {
          helpers.setFieldError('otp', messages.accountMatchError)
        }
      } catch (e) {
        if (isOtpMissingError(e)) {
          helpers.resetForm({ values })
          setPage(ChangePasswordPage.VerifyEmail)
        } else if (page === ChangePasswordPage.ConfirmPassword) {
          helpers.setFieldError('password', messages.invalidCredentials)
        } else if (page === ChangePasswordPage.VerifyEmail) {
          helpers.setFieldError('otp', messages.invalidCredentials)
        }
      }
    },
    [setPage, page, authService]
  )

  const changeCredentials = useCallback(
    async (values: ChangePasswordFormValues) => {
      const { oldEmail: email, oldPassword, password } = values
      await authService.changeCredentials({
        newUsername: email,
        newPassword: password,
        oldUsername: email,
        oldPassword
      })
      onComplete()
    },
    [onComplete, authService]
  )

  const onSubmit = useCallback(
    async (
      values: ChangePasswordFormValues,
      helpers: FormikHelpers<ChangePasswordFormValues>
    ) => {
      if (page === ChangePasswordPage.NewPassword) {
        await changeCredentials(values)
      } else {
        await confirmCredentials(values, helpers)
      }
    },
    [page, confirmCredentials, changeCredentials]
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
