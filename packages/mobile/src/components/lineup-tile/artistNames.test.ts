import { getTrackArtistNames } from './artistNames'

describe('getTrackArtistNames', () => {
  it('combines owner and collaborator names', () => {
    expect(
      getTrackArtistNames('ray61626b', [
        { user_id: 2, name: 'dj g8r' },
        { user_id: 3, name: 'tim' }
      ])
    ).toBe('ray61626b, dj g8r, tim')
  })

  it('omits missing collaborator names', () => {
    expect(
      getTrackArtistNames('ray61626b', [
        { user_id: 2, name: null },
        { user_id: 3, name: undefined },
        { user_id: 4, name: 'dj g8r' }
      ])
    ).toBe('ray61626b, dj g8r')
  })
})
