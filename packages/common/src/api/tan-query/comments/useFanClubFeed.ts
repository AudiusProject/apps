import { useEffect } from 'react'

import { OptionalHashId } from '@audius/sdk'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { commentFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { QUERY_KEYS } from '../queryKeys'
import { QueryKey } from '../types'
import { useCurrentUserId } from '../users/account/useCurrentUserId'
import { primeCommentData } from '../utils/primeCommentData'
import { primeRelatedData } from '../utils/primeRelatedData'

export type FanClubFeedItem =
  | { itemType: 'text_post'; commentId: ID }
  | { itemType: 'track'; trackId: ID }

const FAN_CLUB_FEED_PAGE_SIZE = 20

export const getFanClubFeedQueryKey = ({
  mint,
  sortMethod
}: {
  mint: string
  sortMethod?: string
}) => {
  return [QUERY_KEYS.fanClubFeed, mint, { sortMethod }] as unknown as QueryKey<
    FanClubFeedItem[]
  >
}

type UseFanClubFeedArgs = {
  mint: string
  sortMethod?: 'top' | 'newest' | 'timestamp'
  pageSize?: number
  enabled?: boolean
}

export const useFanClubFeed = ({
  mint,
  sortMethod = 'newest',
  pageSize = FAN_CLUB_FEED_PAGE_SIZE,
  enabled = true
}: UseFanClubFeedArgs) => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()

  const queryRes = useInfiniteQuery({
    initialPageParam: 0,
    getNextPageParam: (lastPage: FanClubFeedItem[], pages) => {
      if (lastPage?.length < pageSize) return undefined
      return (pages.length ?? 0) * pageSize
    },
    queryKey: getFanClubFeedQueryKey({ mint, sortMethod }),
    queryFn: async ({ pageParam }): Promise<FanClubFeedItem[]> => {
      const sdk = await audiusSdk()
      const response = await sdk.comments.getFanClubFeed({
        mint,
        userId: currentUserId?.toString(),
        offset: pageParam,
        limit: pageSize,
        sortMethod
      })

      // Prime related data (users, tracks) in cache
      primeRelatedData({ related: response.related, queryClient })

      // Prime individual comment data and build feed items
      const feedItems: FanClubFeedItem[] = []

      for (const item of response.data) {
        if (item.item_type === 'text_post') {
          const comment = commentFromSDK(item.comment)
          if (comment) {
            primeCommentData({ comments: [comment], queryClient })
            feedItems.push({ itemType: 'text_post', commentId: comment.id })
          }
        } else if (item.item_type === 'track') {
          const trackId = OptionalHashId.parse(item.track?.id)
          if (trackId) {
            feedItems.push({ itemType: 'track', trackId })
          }
        }
      }

      return feedItems
    },
    select: (data) => data.pages.flat(),
    enabled: enabled && !!mint
  })

  const { error } = queryRes

  useEffect(() => {
    if (error) {
      reportToSentry({
        error,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(
        toast({
          content: 'There was an error loading the feed. Please try again.'
        })
      )
    }
  }, [error, dispatch, reportToSentry])

  return queryRes
}
