import { describe, expect, it } from 'vitest'

import { weeklyArtistRecapNotificationMessages as messages } from '~/messages/notifications'
import { NotificationType } from '~/store/notifications/types'

import { notificationFromSDK } from './notification'

const recapRow = (data: Record<string, unknown>) =>
  ({
    type: 'weekly_artist_recap',
    groupId: 'weekly_artist_recap:2026-37:1',
    isSeen: false,
    actions: [
      {
        specifier: 'Eg',
        type: 'weekly_artist_recap',
        timestamp: 1789000000,
        data
      }
    ]
  }) as unknown as Parameters<typeof notificationFromSDK>[0]

describe('weekly_artist_recap', () => {
  it('maps the api row', () => {
    expect(
      notificationFromSDK(
        recapRow({
          year: 2026,
          week: 37,
          play_count: 1240,
          follower_count: 18,
          save_count: 42,
          rotation_save_count: 5,
          top_city: 'Atlanta'
        })
      )
    ).toMatchObject({
      type: NotificationType.WeeklyArtistRecap,
      playCount: 1240,
      followerCount: 18,
      saveCount: 42,
      rotationSaveCount: 5,
      topCity: 'Atlanta',
      year: 2026,
      week: 37,
      groupId: 'weekly_artist_recap:2026-37:1'
    })
  })

  it('leaves topCity out when the api has none', () => {
    const n = notificationFromSDK(
      recapRow({
        year: 2026,
        week: 37,
        play_count: 1,
        follower_count: 0,
        save_count: 0,
        rotation_save_count: 0
      })
    )
    expect(n).toMatchObject({ playCount: 1 })
    expect((n as { topCity?: string }).topCity).toBeUndefined()
  })

  it('writes the recap copy', () => {
    expect(
      messages.body({
        playCount: 1240,
        followerCount: 18,
        saveCount: 42,
        topCity: 'Atlanta'
      })
    ).toBe('1,240 plays, 18 new followers, top city Atlanta, 42 saves')
    expect(
      messages.body({ playCount: 1, followerCount: 0, saveCount: 0 })
    ).toBe('1 play')
    expect(messages.rotationSaves(1)).toBe(
      '1 save came from Weekly Rotation listeners.'
    )
  })
})
