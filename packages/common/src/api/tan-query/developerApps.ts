import { Id, DeveloperApp as SDKDeveloperApp } from '@audius/sdk'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { z } from 'zod'

import { useAudiusQueryContext } from '~/audius-query'
import { ID } from '~/models/Identifiers'
import { Nullable } from '~/utils/typeUtils'

import { QUERY_KEYS } from './queryKeys'
import { QueryKey, SelectableQueryOptions } from './types'
import { useCurrentUserId } from './useCurrentUserId'

export const DEVELOPER_APP_DESCRIPTION_MAX_LENGTH = 128
export const DEVELOPER_APP_NAME_MAX_LENGTH = 50
export const DEVELOPER_APP_IMAGE_URL_MAX_LENGTH = 2000
const DEVELOPER_APP_IMAGE_URL_REGEX = /^(https?):\/\//i

const messages = {
  invalidUrl: 'Invalid URL'
}

export const developerAppSchema = z.object({
  userId: z.number(),
  name: z.string().max(DEVELOPER_APP_NAME_MAX_LENGTH),
  imageUrl: z.optional(
    z
      .string()
      .max(DEVELOPER_APP_IMAGE_URL_MAX_LENGTH)
      .refine((value) => DEVELOPER_APP_IMAGE_URL_REGEX.test(value), {
        message: messages.invalidUrl
      })
  ),
  description: z.string().max(DEVELOPER_APP_DESCRIPTION_MAX_LENGTH).optional()
})

export const developerAppEditSchema = z.object({
  userId: z.number(),
  apiKey: z.string(),
  name: z.string().max(DEVELOPER_APP_NAME_MAX_LENGTH),
  imageUrl: z.optional(
    z
      .string()
      .max(DEVELOPER_APP_IMAGE_URL_MAX_LENGTH)
      .refine((value) => DEVELOPER_APP_IMAGE_URL_REGEX.test(value), {
        message: messages.invalidUrl
      })
  ),
  description: z.string().max(DEVELOPER_APP_DESCRIPTION_MAX_LENGTH).optional()
})

export type DeveloperApp = {
  name: string
  description?: string
  imageUrl?: string
  apiKey: string
  apiSecret?: string
}

type UseAddDeveloperAppArgs = Omit<DeveloperApp, 'apiKey'> & {
  userId: number
}

type UseEditDeveloperAppArgs = Omit<DeveloperApp, 'apiSecret'> & { userId: ID }

type UseDeleteDeveloperAppArgs = {
  apiKey: string
  userId: ID
}

export const getDeveloperAppsQueryKey = (userId: Nullable<ID>) => {
  return [QUERY_KEYS.developerApps, userId] as unknown as QueryKey<
    DeveloperApp[]
  >
}

export const useDeveloperApps = <TResult = DeveloperApp[]>(
  options?: SelectableQueryOptions<SDKDeveloperApp[], TResult>
) => {
  const { audiusSdk } = useAudiusQueryContext()
  const { data: userId } = useCurrentUserId()

  return useQuery({
    queryKey: getDeveloperAppsQueryKey(userId),
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data = [] } = await sdk.users.getDeveloperApps({
        id: Id.parse(userId)
      })

      return data
    },
    ...options,
    enabled: options?.enabled !== false && !!userId
  })
}

export const useAddDeveloperApp = () => {
  const { audiusSdk } = useAudiusQueryContext()

  return useMutation({
    mutationFn: async (args: UseAddDeveloperAppArgs) => {
      const { name, description, imageUrl, userId } = args
      const encodedUserId = Id.parse(userId)
      const sdk = await audiusSdk()

      const { apiKey, apiSecret } = await sdk.developerApps.createDeveloperApp({
        name,
        description,
        imageUrl,
        userId: encodedUserId
      })

      await sdk.grants.createGrant({
        userId: encodedUserId,
        appApiKey: apiKey
      })

      return { name, description, imageUrl, apiKey, apiSecret }
    }
  })
}

export const useEditDeveloperApp = () => {
  const { audiusSdk } = useAudiusQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: UseEditDeveloperAppArgs) => {
      const { name, description, imageUrl, userId, apiKey } = args
      const encodedUserId = Id.parse(userId)
      const sdk = await audiusSdk()

      await sdk.developerApps.updateDeveloperApp({
        appApiKey: apiKey,
        name,
        description,
        imageUrl,
        userId: encodedUserId
      })

      return { name, description, imageUrl, apiKey }
    },
    onMutate: (args) => {
      const { userId, ...editedApp } = args

      queryClient.invalidateQueries({
        queryKey: getDeveloperAppsQueryKey(userId)
      })

      const previousApps =
        queryClient.getQueryData(getDeveloperAppsQueryKey(userId)) ?? []
      const appIndex = previousApps.findIndex(
        (app) => app.apiKey === editedApp.apiKey
      )

      const newApps = cloneDeep(previousApps)
      newApps[appIndex] = {
        ...previousApps[appIndex],
        ...editedApp
      }

      queryClient.setQueryData(getDeveloperAppsQueryKey(userId), newApps)

      // Return context with the previous apps
      return { previousApps }
    },
    onError: (_error, args, context) => {
      queryClient.setQueryData(
        getDeveloperAppsQueryKey(args.userId),
        context?.previousApps
      )
    }
  })
}

export const useDeleteDeveloperApp = () => {
  const { audiusSdk } = useAudiusQueryContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (args: UseDeleteDeveloperAppArgs) => {
      const { apiKey, userId } = args
      const sdk = await audiusSdk()

      await sdk.developerApps.deleteDeveloperApp({
        userId: Id.parse(userId),
        appApiKey: apiKey
      })
    },
    onMutate: (args) => {
      const { apiKey, userId } = args

      queryClient.invalidateQueries({
        queryKey: getDeveloperAppsQueryKey(userId)
      })

      const previousApps = queryClient.getQueryData(
        getDeveloperAppsQueryKey(userId)
      )

      if (previousApps === undefined) {
        return {
          previousApps: []
        }
      }

      // Splice out the deleted app
      const appIndex = previousApps?.findIndex((app) => app.apiKey === apiKey)
      const newApps = cloneDeep(previousApps).splice(appIndex, 1)

      queryClient.setQueryData(getDeveloperAppsQueryKey(userId), newApps)

      // Return context with the previous apps
      return { previousApps }
    },
    onError: (_error, args, context) => {
      queryClient.setQueryData(
        getDeveloperAppsQueryKey(args.userId),
        context?.previousApps
      )
    }
  })
}
