import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context/appContext'
import { Name } from '~/models/Analytics'
import { ID } from '~/models/Identifiers'
import { Track } from '~/models/Track'
import { accountActions } from '~/store/account'
import { tracksSocialActions } from '~/store/social'

import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { useUser } from '../users/useUser'
import { primeTrackData } from '../utils/primeTrackData'

import { getTrackQueryKey } from './useTrack'

const getUnfavoriteMutationKey = (trackId: ID) => ['unfavorite-track', trackId]

export type UnfavoriteTrackArgs = {
  trackId: ID
  source: string
}

export const useUnfavoriteTrack = () => {
  const { audiusSdk } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useUser(currentUserId)
  const {
    analytics: { track: trackEvent }
  } = useAppContext()

  return useMutation({
    mutationFn: async ({ trackId }: UnfavoriteTrackArgs) => {
      if (!currentUserId) throw new Error('User ID is required')
      const isMutationInFlight = queryClient.isFetching({
        queryKey: getUnfavoriteMutationKey(trackId)
      })
      if (isMutationInFlight) return
      const sdk = await audiusSdk()
      await sdk.tracks.unfavoriteTrack({
        trackId: Id.parse(trackId),
        userId: Id.parse(currentUserId)
      })
    },
    onMutate: async ({ trackId, source }) => {
      if (!currentUserId || !currentUser) {
        throw new Error('User ID is required')
      }

      await queryClient.cancelQueries({ queryKey: getTrackQueryKey(trackId) })

      const previousTrack = queryClient.getQueryData(getTrackQueryKey(trackId))
      if (!previousTrack) throw new Error('Track not found')

      if (previousTrack.owner_id === currentUserId)
        throw new Error('Cannot unfavorite your own track')

      if (!previousTrack.has_current_user_saved)
        throw new Error('Track not favorited')

      dispatch(accountActions.decrementTrackSaveCount())

      trackEvent({
        eventName: Name.UNFAVORITE,
        properties: {
          kind: 'track',
          source,
          id: trackId
        }
      })

      const update: Partial<Track> = {
        has_current_user_saved: false,
        save_count: Math.max(previousTrack.save_count - 1, 0)
      }

      const remixTrack = previousTrack.remix_of?.tracks?.[0]
      const isCoSign = remixTrack?.user?.user_id === currentUserId
      if (remixTrack && isCoSign) {
        const remixOf = {
          tracks: [
            {
              ...remixTrack,
              has_remix_author_saved: false
            }
          ]
        }
        update.remix_of = remixOf
        if (
          remixOf.tracks[0].has_remix_author_saved ||
          remixOf.tracks[0].has_remix_author_reposted
        ) {
          update._co_sign = remixOf.tracks[0]
        } else {
          update._co_sign = null
        }
      }

      primeTrackData({
        tracks: [{ ...previousTrack, ...update }],
        queryClient,
        forceReplace: true
      })

      return { previousTrack, previousUser: currentUser }
    },
    onSuccess: async (_, { trackId }) => {
      dispatch(tracksSocialActions.unsaveTrackSucceeded(trackId))
    },
    onError: (error, _args, context) => {
      if (!context) return

      primeTrackData({
        tracks: [context.previousTrack],
        queryClient,
        forceReplace: true
      })
      dispatch(accountActions.incrementTrackSaveCount())

      console.error(error)
    }
  })
}
