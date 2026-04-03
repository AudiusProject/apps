import { Id } from '@audius/sdk'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cloneDeep } from 'lodash'
import { useDispatch } from 'react-redux'

import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { FanClubFeedItem, getFanClubFeedQueryKey } from './useFanClubFeed'
import { getCommentQueryKey } from './utils'

export type DeleteTextPostArgs = {
  commentId: ID
  userId: ID
  mint: string
  sortMethod?: string
}

export const useDeleteTextPost = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  return useMutation({
    mutationFn: async ({ commentId, userId }: DeleteTextPostArgs) => {
      const sdk = await audiusSdk()
      return await sdk.comments.deleteComment({
        userId: Id.parse(userId),
        commentId: Id.parse(commentId)
      })
    },
    onMutate: ({ commentId, mint, sortMethod = 'newest' }) => {
      // Remove from the fan club feed
      const feedQueryKey = getFanClubFeedQueryKey({ mint, sortMethod })
      queryClient.setQueryData(feedQueryKey, (prevData: any) => {
        if (!prevData) return prevData
        const newState = cloneDeep(prevData)
        if (newState.pages) {
          newState.pages = newState.pages.map((page: FanClubFeedItem[]) =>
            page.filter(
              (item) =>
                !(item.itemType === 'text_post' && item.commentId === commentId)
            )
          )
        }
        return newState
      })
      // Remove the individual comment cache
      queryClient.removeQueries({
        queryKey: getCommentQueryKey(commentId),
        exact: true
      })
    },
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({
        queryKey: getFanClubFeedQueryKey({
          mint: args.mint,
          sortMethod: args.sortMethod ?? 'newest'
        })
      })
    },
    onError: (error: Error, args) => {
      reportToSentry({
        error,
        additionalInfo: args,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(toast({ content: 'There was an error deleting the post.' }))
      // Reset to server state
      queryClient.invalidateQueries({
        queryKey: getFanClubFeedQueryKey({
          mint: args.mint,
          sortMethod: args.sortMethod ?? 'newest'
        })
      })
    }
  })
}
