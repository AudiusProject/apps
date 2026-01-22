import { HashId, Id, type UploadResponse } from '@audius/sdk'
import { mutationOptions, useMutation } from '@tanstack/react-query'

import { trackMetadataForUploadToSdk } from '~/adapters'
import { StemCategory, Name } from '~/models'
import { ProgressStatus, uploadActions } from '~/store'
import type { TrackMetadataForUpload } from '~/store'

import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useQueryContext, type QueryContextType } from '../utils'

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
  metadata: TrackMetadataForUpload
  imageUploadResponse: UploadResponse
  stemsUploadResponses: UploadResponse[]
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
    (params.metadata.stems ?? []).map(async (stem, index) => {
      try {
        const stemUploadResponse = params.stemsUploadResponses?.[index]
        if (!stemUploadResponse) {
          throw new Error(`No upload response found for stem ${index}`)
        }
        const metadata = {
          ...stem.metadata,
          genre: params.metadata.genre,
          is_downloadable: true,
          stem_of: {
            category: stem.category ?? StemCategory.OTHER,
            parent_track_id: params.parentTrackId
          }
        }
        const stemRes = await sdk.tracks.publishTrack({
          userId: Id.parse(userId),
          metadata: trackMetadataForUploadToSdk(metadata),
          audioUploadResponse: stemUploadResponse,
          imageUploadResponse: params.imageUploadResponse
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
            category: stem.category ?? StemCategory.OTHER
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
  const { data: userId } = useCurrentUserId()

  return useMutation({
    ...options,
    ...getPublishStemsOptions({ ...context, userId: userId! })
  })
}
