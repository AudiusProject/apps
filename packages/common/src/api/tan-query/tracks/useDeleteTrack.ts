import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context/appContext'
import { Name } from '~/models/Analytics'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { Track } from '~/models/Track'
import { UserMetadata } from '~/models/User'
import { deleteTrackRequested } from '~/store/cache/tracks/actions'

import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'
import { primeTrackData } from '../utils/primeTrackData'
import { primeUserData } from '../utils/primeUserData'

import { getTrackQueryKey } from './useTrack'

type DeleteTrackArgs = {
  trackId: ID
  source?: string
}

type MutationContext = {
  previousTrack: Track | undefined
  previousUser: any | undefined
}

export const useDeleteTrack = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useUser(currentUserId)
  const {
    analytics: { track: trackEvent }
  } = useAppContext()

  return useMutation({
    mutationFn: async ({ trackId }: DeleteTrackArgs) => {
      if (!currentUserId) throw new Error('User ID is required')
      const sdk = await audiusSdk()

      await sdk.tracks.deleteTrack({
        trackId: Id.parse(trackId),
        userId: Id.parse(currentUserId)
      })

      return { trackId }
    },
    onMutate: async ({ trackId, source }): Promise<MutationContext> => {
      if (!currentUserId || !currentUser) {
        throw new Error('User ID is required')
      }

      // Snapshot the previous values
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      if (!previousTrack) throw new Error('Track not found')

      // Triggers removal from profile lineup
      dispatch(deleteTrackRequested(trackId))

      // Before deleting, check if the track is set as the artist pick & update if so
      if (currentUser.artist_pick_track_id === trackId) {
        const updatedCurrentUser: UserMetadata = {
          ...currentUser,
          artist_pick_track_id: null
        }

        primeUserData({
          users: [updatedCurrentUser],
          queryClient,
          forceReplace: true
        })
      }

      // Optimistic update in cache
      primeTrackData({
        tracks: [
          {
            ...previousTrack,
            _marked_deleted: true
          }
        ],
        queryClient,
        forceReplace: true
      })

      trackEvent({
        eventName: Name.DELETE,
        properties: {
          kind: 'track',
          id: trackId,
          source
        }
      })

      return { previousTrack, previousUser: currentUser }
    },
    onSuccess: async (_, { trackId }) => {
      const track = queryClient.getQueryData(getTrackQueryKey(trackId))

      if (track?.stem_of) {
        trackEvent({
          eventName: Name.STEM_DELETE,
          properties: {
            id: track.track_id,
            parent_track_id: track.stem_of.parent_track_id,
            category: track.stem_of.category
          }
        })
      }
    },
    onError: (error, { trackId }, context) => {
      if (!context || !currentUserId || !context.previousTrack) return

      // Revert optimistic updates
      primeTrackData({
        tracks: [
          {
            ...context.previousTrack
          }
        ],
        queryClient,
        forceReplace: true
      })

      if (context.previousUser?.artist_pick_track_id === trackId) {
        primeUserData({
          users: [
            {
              ...context.previousUser,
              artist_pick_track_id: trackId
            }
          ],
          queryClient,
          forceReplace: true
        })
      }

      reportToSentry({
        error,
        additionalInfo: { trackId },
        name: 'Delete Track',
        feature: Feature.Edit
      })
    }
  })
}
