import { QueryClient, useQuery } from '@tanstack/react-query'

import { useQueryContext } from '~/api/tan-query/utils'
import { QueryContextType } from '~/api/tan-query/utils/QueryContext'
import { isValidEmailString } from '~/utils/email'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey, SelectableQueryOptions } from '../types'

type EmailInUse = { exists: boolean; isGuest: boolean }

export const emailInUseErrorMessages = {
  rateLimited: 'Too many attempts. Try again in a minute.',
  somethingWentWrong: 'Something went wrong. Try again later.'
}

export const fetchEmailInUse = async (
  email: string | null | undefined,
  { identityService }: QueryContextType
) => {
  if (!email) return { exists: false, isGuest: false }
  return await identityService.checkIfEmailRegistered(email)
}

export const getEmailInUseQueryKey = (email: string | null | undefined) => {
  return [QUERY_KEYS.emailInUse, email] as unknown as QueryKey<EmailInUse>
}

/**
 * Email-in-use lookup for zod form validators.
 * Returns null without a request until the email is complete, and returns an
 * error message instead of throwing because zod-formik-adapter crashes on
 * non-zod errors.
 */
export const fetchEmailInUseForValidation = async (
  email: string,
  queryContext: QueryContextType,
  queryClient: QueryClient
): Promise<EmailInUse | { error: string } | null> => {
  if (!isValidEmailString(email)) return null
  try {
    return await queryClient.fetchQuery({
      queryKey: getEmailInUseQueryKey(email),
      queryFn: async () => await fetchEmailInUse(email, queryContext)
    })
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    return {
      error:
        status === 429
          ? emailInUseErrorMessages.rateLimited
          : emailInUseErrorMessages.somethingWentWrong
    }
  }
}

/**
 * Hook to check if an email is already registered
 */
export const useEmailInUse = <TResult = EmailInUse>(
  email: string | null | undefined,
  options?: SelectableQueryOptions<EmailInUse, TResult>
) => {
  const context = useQueryContext()

  return useQuery({
    queryKey: getEmailInUseQueryKey(email),
    queryFn: () => fetchEmailInUse(email, context),
    ...options,
    enabled: options?.enabled !== false && !!email
  })
}
