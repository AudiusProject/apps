import { Comment, ReplyComment } from '~/models'

export type CommentOrReply = Comment | ReplyComment

export const COMMENT_ROOT_PAGE_SIZE = 15
export const COMMENT_REPLIES_PAGE_SIZE = 15
export const COMMENT_LIST_MUTATION_KEY = ['commentListMutation'] as const

export const messages = {
  loadError: (type: 'comments' | 'replies') =>
    `There was an error loading ${type}. Please try again.`,
  mutationError: (
    actionType:
      | 'pinning'
      | 'unpinning'
      | 'deleting'
      | 'posting'
      | 'editing'
      | 'reacting to'
      | 'reporting'
  ) => `There was an error ${actionType} that comment. Please try again`,
  muteUserError: 'There was an error muting that user. Please try again.',
  updateTrackCommentNotificationSettingError:
    'There was an error updating the track comment notification setting. Please try again.',
  updateCommentNotificationSettingError:
    'There was an error updating the comment notification setting. Please try again.'
}

export type TrackCommentCount = {
  previousValue: number
  currentValue: number
}
