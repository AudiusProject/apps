import { Entity, Notification, NotificationType } from '@audius/common/store'
import { HashId } from '@audius/sdk'

import { testTrack } from './tracks'
import { artistUser } from './users'

/**
 * TODO: make a factory for notifs by type
 */
export const mockNotification: Notification = {
  id: 'timestamp:1748626676:group_id:create:track:user_id:123',
  groupId: 'create:track:user_id:123',
  type: NotificationType.UserSubscription as const,
  entityType: Entity.Track,
  entityIds: [HashId.parse(testTrack.id)],
  userId: HashId.parse(artistUser.id),
  timeLabel: '2 hours ago',
  isViewed: true,
  timestamp: 1748626676
}
