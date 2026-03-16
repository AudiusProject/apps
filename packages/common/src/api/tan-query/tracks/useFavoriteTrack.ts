import { Id } from '@audius/sdk/services'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context/appContext'
import { Name } from '~/models/Analytics'
import { Feature } from '~/models/ErrorReporting'
import { ID } from '~/models/Identifiers'
import { Track } from '~/models/Track'
import { accountActions } from '~/store/account'
import { tracksSocialActions } from '~/store/social'

import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'
import { primeTrackData } from '../utils/primeTrackData'

import { getTrackQueryKey } from './useTrack'

type FavoriteTrackArgs = {
  trackId: ID
  source?: string
}

export const useFavoriteTrack = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useUser(currentUserId)
  const {
    analytics: { track: trackEvent }
  } = useAppContext()

  return useMutation({
    mutationFn: async ({ trackId }: FavoriteTrackArgs) => {
      if (!currentUserId) throw new Error('User ID is required')
      const sdk = await audiusSdk()
      await sdk.tracks.favoriteTrack({
        trackId: Id.parse(trackId),
        userId: Id.parse(currentUserId)
      })
    },
    onMutate: async ({ trackId, source }) => {
      if (!currentUserId || !currentUser) {
        // TODO: throw toast and redirect to sign in
        throw new Error('User ID is required')
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: getTrackQueryKey(trackId) })

      // Snapshot the previous values
      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      if (!previousTrack) throw new Error('Track not found')

      // Don't allow favoriting your own track
      if (previousTrack.owner_id === currentUserId)
        throw new Error('Cannot favorite your own track')

      // Don't allow favoriting if already favorited
      if (previousTrack.has_current_user_saved)
        throw new Error('Track already favorited')

      // Increment the save count
      dispatch(accountActions.incrementTrackSaveCount())

      // Track analytics event
      trackEvent({
        eventName: Name.FAVORITE,
        properties: {
          kind: 'track',
          source,
          id: trackId
        }
      })

      // Optimistically update track data
      const update: Partial<Track> = {
        has_current_user_saved: true,
        save_count: previousTrack.save_count + 1
      }

      // Handle co-sign logic for remixes
      const remixTrack = previousTrack.remix_of?.tracks?.[0]
      const isCoSign = remixTrack?.user?.user_id === currentUserId
      if (remixTrack && isCoSign) {
        const remixOf = {
          tracks: [
            {
              ...remixTrack,
              has_remix_author_saved: true
            }
          ]
        }
        update.remix_of = remixOf
        update._co_sign = remixOf.tracks[0]
      }

      primeTrackData({
        tracks: [{ ...previousTrack, ...update }],
        queryClient,
        forceReplace: true
      })

      return { previousTrack, previousUser: currentUser }
    },
    onSuccess: async (_, { trackId }) => {
      // Handle co-sign events after successful save
      const track = queryClient.getQueryData(getTrackQueryKey(trackId))
      if (!track) return

      const remixTrack = track.remix_of?.tracks?.[0]
      const isCoSign = remixTrack?.user?.user_id === currentUserId
      if (isCoSign) {
        const parentTrackId = remixTrack?.parent_track_id
        const hasAlreadyCoSigned =
          remixTrack?.has_remix_author_reposted ||
          remixTrack?.has_remix_author_saved

        const parentTrack = queryClient.getQueryData(
          getTrackQueryKey(parentTrackId)
        )

        // Dispatch co-sign events
        trackEvent({
          eventName: Name.REMIX_COSIGN_INDICATOR,
          properties: {
            id: trackId,
            handle: currentUser?.handle,
            original_track_id: parentTrack?.track_id,
            original_track_title: parentTrack?.title,
            action: 'favorited'
          }
        })

        if (!hasAlreadyCoSigned) {
          trackEvent({
            eventName: Name.REMIX_COSIGN,
            properties: {
              id: trackId,
              handle: currentUser?.handle,
              original_track_id: parentTrack?.track_id,
              original_track_title: parentTrack?.title,
              action: 'favorited'
            }
          })
        }
      }

      // Dispatch the saveTrackSucceeded action
      dispatch(tracksSocialActions.saveTrackSucceeded(trackId))
    },
    onError: (error, { trackId }, context) => {
      if (!context) return

      // Revert optimistic updates
      primeTrackData({
        tracks: [context.previousTrack],
        queryClient,
        forceReplace: true
      })
      dispatch(accountActions.decrementTrackSaveCount())

      reportToSentry({
        error,
        additionalInfo: { trackId },
        name: 'Favorite Track',
        feature: Feature.Social
      })
    }
  })
}
