import {
  CommentSectionProvider,
  useCurrentCommentSection,
  usePostComment
} from '@audius/common/context'
import { commentsMessages as messages } from '@audius/common/messages'
import type { ID } from '@audius/common/models'
import { Status } from '@audius/common/models'
import { TouchableOpacity } from 'react-native'

import {
  Flex,
  IconCaretRight,
  Paper,
  PlainButton,
  Text
} from '@audius/harmony-native'
import { useDrawer } from 'app/hooks/useDrawer'

import Skeleton from '../skeleton'

import { CommentBlock } from './CommentBlock'
import { CommentForm } from './CommentForm'

const CommentSectionHeader = () => {
  const {
    entityId,
    commentSectionLoading: isLoading,
    comments,
    commentCount
  } = useCurrentCommentSection()
  const { onOpen: openDrawer } = useDrawer('Comment')

  const handlePressViewAll = () => {
    openDrawer({ entityId })
  }

  const isShowingComments = !isLoading && comments?.length

  return (
    <Flex
      direction='row'
      w='100%'
      justifyContent='space-between'
      alignItems='center'
    >
      <Text variant='title' size='m'>
        Comments
        {isShowingComments ? (
          <Text color='subdued'>&nbsp;({commentCount})</Text>
        ) : null}
      </Text>
      {isShowingComments ? (
        <PlainButton
          onPress={handlePressViewAll}
          iconRight={IconCaretRight}
          variant='subdued'
        >
          {messages.viewAll}
        </PlainButton>
      ) : null}
    </Flex>
  )
}

const CommentSectionContent = () => {
  const { commentSectionLoading: isLoading, comments } =
    useCurrentCommentSection()

  const [postComment, { status: postCommentStatus }] = usePostComment()

  const handlePostComment = (message: string) => {
    postComment(message, undefined)
  }

  // Loading state
  if (isLoading) {
    return (
      <Flex direction='row' gap='s' alignItems='center'>
        <Skeleton width={40} height={40} style={{ borderRadius: 100 }} />
        <Flex gap='s'>
          <Skeleton height={20} width={240} />
          <Skeleton height={20} width={160} />
        </Flex>
      </Flex>
    )
  }

  // Empty state
  if (!comments || !comments.length) {
    return (
      <Flex gap='m'>
        <Text variant='body'>{messages.noComments}</Text>
        <CommentForm
          onSubmit={handlePostComment}
          isLoading={postCommentStatus === Status.LOADING}
        />
      </Flex>
    )
  }

  return <CommentBlock commentId={comments[0].id} hideActions />
}

type CommentSectionProps = {
  entityId: ID
}

export const CommentSection = (props: CommentSectionProps) => {
  const { entityId } = props

  const { onOpen: openDrawer } = useDrawer('Comment')

  const handlePress = () => {
    openDrawer({ entityId })
  }

  return (
    <CommentSectionProvider entityId={entityId}>
      <Flex gap='s' direction='column' w='100%' alignItems='flex-start'>
        <CommentSectionHeader />
        <Paper w='100%' direction='column' gap='s' p='l'>
          <TouchableOpacity onPress={handlePress}>
            <CommentSectionContent />
          </TouchableOpacity>
        </Paper>
      </Flex>
    </CommentSectionProvider>
  )
}
