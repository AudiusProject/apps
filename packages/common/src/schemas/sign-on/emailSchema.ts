import { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { QueryContextType } from '~/api'
import { fetchEmailInUseForValidation } from '~/api/tan-query/users/useEmailInUse'
import { EMAIL_REGEX } from '~/utils/email'

export const emailSchemaMessages = {
  emailRequired: 'Please enter an email.',
  invalidEmail: 'Please enter a valid email.',
  emailInUse: 'Email already taken.',
  somethingWentWrong: 'Something went wrong. Try again later.',
  guestAccountExists: 'Guest account exists.'
}

export const emailSchema = (
  queryContext: QueryContextType,
  queryClient: QueryClient
) =>
  z.object({
    email: z
      .string({ required_error: emailSchemaMessages.emailRequired })
      .regex(EMAIL_REGEX, { message: emailSchemaMessages.invalidEmail })
      .superRefine(async (email, ctx) => {
        const result = await fetchEmailInUseForValidation(
          email,
          queryContext,
          queryClient
        )
        if (!result) return z.NEVER
        if ('error' in result) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.error
          })
          return z.NEVER
        }
        const { exists: isEmailInUse, isGuest } = result
        if (isEmailInUse === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: emailSchemaMessages.somethingWentWrong
          })
        } else if (isGuest) {
          // complete guest accounts only
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: emailSchemaMessages.guestAccountExists
          })
          return true
        } else if (isEmailInUse) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: emailSchemaMessages.emailInUse
          })
        }
        return z.NEVER // The return value is not used, but we need to return something to satisfy the typing
      })
  })
