import { type AudiusSdk } from '@audius/sdk'
import { useMutation } from '@tanstack/react-query'
import { mutationOptions } from './mutationOptions'

type UploadFile = {
  clientId: string
} & ReturnType<AudiusSdk['tracks']['uploadTrackFiles']>

type UploadFilesParams = {
  files: UploadFile[]
}

const getUploadFilesOptions = () => {
  return mutationOptions({
    mutationFn: async (params: UploadFilesParams) => {
      return await Promise.all(
        params.files.map(async (u) => {
          const res = await u.start()
          return { ...res, clientId: u.clientId }
        })
      )
    }
  })
}

type UseUploadFilesOptions = ReturnType<typeof getUploadFilesOptions>

export const useUploadFiles = (options?: UseUploadFilesOptions) => {
  return useMutation({
    ...options,
    ...getUploadFilesOptions()
  })
}
