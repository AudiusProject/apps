import { CommonState } from '~/store/commonStore'
import { NotificationType } from '~/store/notifications/types'
import { formatCount } from '~/utils/decimal'

const getBaseState = (state: CommonState) => state.ui.userList.notifications

export const getNotification = (state: CommonState) =>
  getBaseState(state).notification

const defaultTitle = 'Users'

export const getPageTitle = (state: CommonState) => {
  const notification = getNotification(state)
  if (!notification) return defaultTitle
  if (!notification || !('userIds' in notification)) return defaultTitle
  const count = notification.userIds.length
  if (notification.type === NotificationType.Follow)
    return `${formatCount(count)} New Followers`
  if (
    notification.type === NotificationType.Comment ||
    notification.type === NotificationType.CommentThread ||
    notification.type === NotificationType.CommentMention ||
    notification.type === NotificationType.CommentReaction
  )
    return `${formatCount(count)} Commenters`
  return `${formatCount(count)} ${notification.type.toLowerCase()}s`
}
