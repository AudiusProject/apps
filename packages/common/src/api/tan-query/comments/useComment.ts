import { useEffect } from 'react'

import { Id } from '@audius/sdk/services'
import { useQuery } from '@tanstack/react-query'
import { useDispatch } from 'react-redux'

import { commentFromSDK } from '~/adapters'
import { useQueryContext } from '~/api/tan-query/utils'
import { Feature, ID } from '~/models'
import { toast } from '~/store/ui/toast/slice'

import { messages } from './types'
import { getCommentQueryKey } from './utils'

export const useComment = (commentId: ID | null | undefined) => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const dispatch = useDispatch()

  const queryRes = useQuery({
    queryKey: getCommentQueryKey(commentId),
    enabled: !!commentId,
    queryFn: async () => {
      const sdk = await audiusSdk()
      const { data: commentRes } = await sdk.comments.getComment({
        commentId: Id.parse(commentId)
      })

      if (!commentRes || commentRes.length === 0) return null

      return commentFromSDK(commentRes[0]) ?? null
    },
    staleTime: Infinity
  })

  const { error } = queryRes

  useEffect(() => {
    if (error) {
      reportToSentry({
        error,
        name: 'Comments',
        feature: Feature.Comments
      })
      dispatch(toast({ content: messages.loadError('comments') }))
    }
  }, [error, dispatch, reportToSentry])

  return queryRes
}
