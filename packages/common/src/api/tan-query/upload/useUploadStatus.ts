import { queryOptions, useQueries, useQuery } from '@tanstack/react-query'

import { QUERY_KEYS } from '../queryKeys'
import { useQueryContext, type QueryContextType } from '../utils/QueryContext'

const getUploadStatusKey = (uploadId: string) =>
  [QUERY_KEYS.uploadStatus, uploadId] as const

type GetUploadStatusParams = {
  uploadId: string
}

type FetchUploadStatusContext = Pick<QueryContextType, 'audiusSdk'>

export const getUploadStatusOptions = (
  context: FetchUploadStatusContext,
  params: GetUploadStatusParams
) =>
  queryOptions({
    queryKey: getUploadStatusKey(params.uploadId),
    queryFn: async () => {
      const sdk = await context.audiusSdk()
      return sdk.services.storage.getUploadStatus(params.uploadId)
    }
  })

export const useUploadStatus = (
  uploadId: string,
  options?: Partial<ReturnType<typeof getUploadStatusOptions>>
) => {
  const context = useQueryContext()
  return useQuery({
    ...options,
    ...getUploadStatusOptions(context, {
      uploadId
    })
  })
}

export const useUploadStatuses = (
  uploadIds: string[],
  options?: Partial<ReturnType<typeof getUploadStatusOptions>>
) => {
  const context = useQueryContext()
  const queries = uploadIds.map((uploadId) => ({
    ...options,
    ...getUploadStatusOptions(context, {
      uploadId
    })
  }))
  return useQueries({
    queries,
    combine: (results) => {
      return {
        data: results.map((r) => r.data),
        isPending: results.some((r) => r.isPending),
        isError: results.some((r) => r.isError),
        isSuccess: results.every((r) => r.isSuccess),
        refetch: (id: string) => {
          const result = results.find((r) => r.data?.id === id)
          return result
            ? result.refetch()
            : Promise.reject(new Error('Upload ID not found'))
        }
      }
    }
  })
}
