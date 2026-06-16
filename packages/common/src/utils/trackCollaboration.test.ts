import { describe, expect, it } from 'vitest'

import {
  getAcceptedTrackCollaborationStorageKey,
  isAcceptedTrackCollaborationStorageValue,
  isTrackCollaborationAccepted
} from './trackCollaboration'

describe('isTrackCollaborationAccepted', () => {
  it('returns true when the current user is an accepted collaborator', () => {
    expect(
      isTrackCollaborationAccepted(
        { collaborators: [{ user_id: 2 }, { user_id: 3 }] },
        3
      )
    ).toBe(true)
  })

  it('returns false when the current user is not an accepted collaborator', () => {
    expect(
      isTrackCollaborationAccepted({ collaborators: [{ user_id: 2 }] }, 3)
    ).toBe(false)
  })

  it('returns false without a track, user, or collaborators', () => {
    expect(isTrackCollaborationAccepted(undefined, 3)).toBe(false)
    expect(isTrackCollaborationAccepted({ collaborators: undefined }, 3)).toBe(
      false
    )
    expect(
      isTrackCollaborationAccepted({ collaborators: [{ user_id: 3 }] }, null)
    ).toBe(false)
  })
})

describe('accepted track collaboration storage helpers', () => {
  it('keys accepted invites by user and track', () => {
    expect(getAcceptedTrackCollaborationStorageKey(1, 2)).toBe(
      'accepted-track-collaboration:1:2'
    )
  })

  it('only treats true as accepted', () => {
    expect(isAcceptedTrackCollaborationStorageValue('true')).toBe(true)
    expect(isAcceptedTrackCollaborationStorageValue('false')).toBe(false)
    expect(isAcceptedTrackCollaborationStorageValue(null)).toBe(false)
  })
})
