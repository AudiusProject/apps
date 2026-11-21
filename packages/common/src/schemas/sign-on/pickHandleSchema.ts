import { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { fetchHandleInUse, fetchHandleReservedStatus, QUERY_KEYS } from '~/api'
import { QueryContextType } from '~/api/tan-query/utils'
import { MAX_HANDLE_LENGTH } from '~/services/oauth'
import { restrictedHandles as commonRestrictedHandles } from '~/utils/restrictedHandles'

export const pickHandleErrorMessages = {
  badCharacterError: 'Please only use A-Z, 0-9, . and _',
  xReservedError: 'This verified X handle is reserved.',
  instagramReservedError: 'This verified Instagram handle is reserved.',
  tiktokReservedError: 'This verified TikTok handle is reserved.',
  genericReservedError: 'This verified handle is reserved.',
  unknownError: 'An unknown error occurred.',
  handleTakenError: 'That handle has already been taken.',
  handleTooLong: 'That handle is too long.',
  missingHandleError: 'Please enter a handle.'
}

export const pickHandleSchema = ({
  queryContext,
  queryClient,
  skipReservedHandleCheck = false,
  restrictedHandles = commonRestrictedHandles
}: {
  queryContext: QueryContextType
  queryClient: QueryClient
  skipReservedHandleCheck?: boolean
  restrictedHandles?: Set<string>
}) => {
  return z.object({
    handle: z
      .string({ required_error: '' })
      .max(MAX_HANDLE_LENGTH, pickHandleErrorMessages.handleTooLong)
      .regex(/^[a-zA-Z0-9_.]*$/, pickHandleErrorMessages.badCharacterError)
      .refine(
        (handle) => !restrictedHandles.has(handle.toLowerCase()),
        pickHandleErrorMessages.handleTakenError
      )
      .superRefine(async (handle, context) => {
        try {
          const isHandleInUse = await queryClient.fetchQuery({
            queryKey: [QUERY_KEYS.handleInUse, handle],
            queryFn: async () => await fetchHandleInUse(handle, queryContext)
          })

          if (isHandleInUse) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: pickHandleErrorMessages.handleTakenError,
              fatal: true
            })
            return z.NEVER
          }
        } catch {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: pickHandleErrorMessages.unknownError
          })
          return z.NEVER
        }
        return z.NEVER
      })
      .superRefine(async (handle, context) => {
        if (skipReservedHandleCheck) return
        try {
          const handleReservedStatus = await queryClient.fetchQuery({
            queryKey: [QUERY_KEYS.handleReservedStatus, handle],
            queryFn: async () =>
              await fetchHandleReservedStatus(handle, queryContext)
          })

          if (handleReservedStatus === 'twitterReserved') {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: pickHandleErrorMessages.xReservedError
            })
          } else if (handleReservedStatus === 'instagramReserved') {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: pickHandleErrorMessages.instagramReservedError
            })
          } else if (handleReservedStatus === 'tikTokReserved') {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: pickHandleErrorMessages.tiktokReservedError
            })
          }
        } catch {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: pickHandleErrorMessages.unknownError
          })
        }
      })
  })
}
