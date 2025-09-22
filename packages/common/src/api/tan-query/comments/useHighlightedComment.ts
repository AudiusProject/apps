import { OptionalHashId } from '@audius/sdk'
import { useSearchParams } from 'react-router-dom-v5-compat'

import { useComment } from './useComment'

export const useHighlightedComment = () => {
  const [searchParams] = useSearchParams()
  const commentIdParam = searchParams.get('commentId')

  const { data: highlightedComment } = useComment(
    OptionalHashId.parse(commentIdParam)
  )

  return highlightedComment
}
