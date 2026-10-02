import { describe, expect, it, vi } from 'vitest'

import {
  NotificationsApi,
  GetNotificationsTypesEnum
} from '../generated/default/apis/NotificationsApi'
import {
  NotificationFromJSON,
  NotificationToJSON
} from '../generated/default/models/Notification'
import { Configuration } from '../generated/default/runtime'

const weeklyRotation = {
  type: 'weekly_rotation',
  group_id: 'weekly_rotation:2026:40',
  is_seen: false,
  actions: [
    {
      specifier: '7eP5n',
      type: 'weekly_rotation',
      timestamp: 1790769600,
      data: { year: 2026, week: 40 }
    }
  ]
}

describe('notifications response parsing', () => {
  it('loads a page containing weekly rotation and existing notification types', async () => {
    const fetchApi = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            unread_count: 2,
            notifications: [
              weeklyRotation,
              {
                type: 'follow',
                group_id: 'follow:7eP5n',
                is_seen: true,
                seen_at: 1790769601,
                actions: [
                  {
                    specifier: 'x5pJ3Aj',
                    type: 'follow',
                    timestamp: 1790769500,
                    data: {
                      follower_user_id: 'x5pJ3Aj',
                      followee_user_id: '7eP5n'
                    }
                  }
                ]
              }
            ]
          },
          related: { users: [], tracks: [], playlists: [] }
        })
      )
    )
    // The SDK wrapper inherits this read method from the generated API.
    const api = new NotificationsApi(
      new Configuration({ basePath: 'https://example.com/v1', fetchApi })
    )

    const response = await api.getNotifications({
      id: '7eP5n',
      userId: '7eP5n',
      limit: 20
    })

    expect(response.data?.unreadCount).toBe(2)
    expect(response.data?.notifications).toEqual([
      {
        type: 'weekly_rotation',
        groupId: weeklyRotation.group_id,
        isSeen: false,
        seenAt: undefined,
        actions: weeklyRotation.actions
      },
      {
        type: 'follow',
        groupId: 'follow:7eP5n',
        isSeen: true,
        seenAt: 1790769601,
        actions: [
          {
            specifier: 'x5pJ3Aj',
            type: 'follow',
            timestamp: 1790769500,
            data: { followerUserId: 'x5pJ3Aj', followeeUserId: '7eP5n' }
          }
        ]
      }
    ])
    expect(response.related).toEqual({ users: [], tracks: [], playlists: [] })
  })

  it('round trips a viewed weekly rotation notification', () => {
    const notification = {
      ...weeklyRotation,
      is_seen: true,
      seen_at: 1790769700
    }
    expect(NotificationToJSON(NotificationFromJSON(notification))).toEqual(
      notification
    )
  })

  it('supports filtering for weekly rotation notifications', () => {
    expect(GetNotificationsTypesEnum.WeeklyRotation).toBe('weekly_rotation')
  })
})
