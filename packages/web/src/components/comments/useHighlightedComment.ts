import { useComment } from '@audius/common/api'
import { OptionalHashId } from '@audius/sdk'
import { useSearchParams } from 'react-router'

export const useHighlightedComment = () => {
  const [searchParams] = useSearchParams()
  const commentIdParam = searchParams.get('commentId')

  const { data: highlightedComment } = useComment(
    OptionalHashId.parse(commentIdParam)
  )

  return highlightedComment
}
