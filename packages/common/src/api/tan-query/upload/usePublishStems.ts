import { HashId, Id, type UploadResponse } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { StemCategory, Name, type StemUpload } from '~/models'
import { ProgressStatus, uploadActions } from '~/store'
import type { TrackMetadataForUpload } from '~/store/upload/types'

import { getStemsQueryKey } from '../tracks/useStems'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext, type QueryContextType } from '../utils'

import { mutationOptions } from './mutationOptions'

const { updateProgress } = uploadActions

type PublishStemsContext = Pick<
  QueryContextType,
  'audiusSdk' | 'analytics' | 'dispatch' | 'reportToSentry'
> & {
  userId: number
}

type PublishStemsParams = {
  clientId: string
  parentTrackId: number
  parentMetadata: TrackMetadataForUpload
  stems: {
    metadata: StemUpload
    audioUploadResponse: UploadResponse
  }[]
}

export const publishStems = async (
  context: PublishStemsContext,
  params: PublishStemsParams
) => {
  const {
    userId,
    audiusSdk,
    dispatch,
    analytics: { make, track }
  } = context

  if (!userId) {
    throw new Error('User ID is required to publish stems')
  }

  const sdk = await audiusSdk()
  return await Promise.all(
    (params.stems ?? []).map(async (stem, index) => {
      try {
        const metadata = {
          category: stem.metadata.category ?? StemCategory.OTHER,
          parentTrackId: Id.parse(params.parentTrackId)
        }
        const stemRes = await sdk.tracks.publishStem({
          userId: Id.parse(userId),
          metadata,
          audioUploadResponse: stem.audioUploadResponse
        })
        dispatch(
          updateProgress({
            clientId: params.clientId,
            stemIndex: index,
            key: 'audio',
            progress: { status: ProgressStatus.COMPLETE }
          })
        )
        track(
          make({
            eventName: Name.STEM_COMPLETE_UPLOAD,
            id: HashId.parse(stemRes.trackId),
            parent_track_id: params.parentTrackId,
            category: stem.metadata.category ?? StemCategory.OTHER
          })
        )
        return { trackId: stemRes.trackId, error: null }
      } catch (e) {
        dispatch(
          updateProgress({
            clientId: params.clientId,
            stemIndex: index,
            key: 'audio',
            progress: { status: ProgressStatus.ERROR }
          })
        )
        console.error('Error publishing stem:', e)
        return { trackId: null, error: e as Error }
      }
    })
  )
}

const getPublishStemsOptions = (context: PublishStemsContext) =>
  mutationOptions({
    mutationFn: async (params: PublishStemsParams) =>
      publishStems(context, params)
  })

export const usePublishStems = (
  options?: Partial<ReturnType<typeof getPublishStemsOptions>> & {
    kind?: 'tracks' | 'album' | 'playlist'
  }
) => {
  const context = useQueryContext()
  const queryClient = useQueryClient()
  const { data: userId } = useCurrentUserId()

  return useMutation({
    ...options,
    ...getPublishStemsOptions({ ...context, userId: userId! }),
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: getStemsQueryKey(params.parentTrackId)
      })
    }
  })
}
