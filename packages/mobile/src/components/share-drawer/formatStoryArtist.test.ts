import type { StoryArtist } from './formatStoryArtist'
import { formatStoryArtist } from './formatStoryArtist'

const artist = (instagram_handle: string | null): StoryArtist => ({
  user_id: 1,
  name: 'Lumen Arcade',
  instagram_handle
})

describe('formatStoryArtist', () => {
  it('appends the Instagram handle when the artist has one', () => {
    expect(formatStoryArtist(artist('lumenarcade'))).toBe(
      'Lumen Arcade · @lumenarcade'
    )
  })

  it('does not double the @ when the handle is stored with one', () => {
    expect(formatStoryArtist(artist('@lumenarcade'))).toBe(
      'Lumen Arcade · @lumenarcade'
    )
  })

  it('falls back to the display name when there is no handle', () => {
    expect(formatStoryArtist(artist(null))).toBe('Lumen Arcade')
    expect(formatStoryArtist(artist('   '))).toBe('Lumen Arcade')
    expect(formatStoryArtist(artist('@'))).toBe('Lumen Arcade')
  })

  it('is empty while the artist is still loading', () => {
    expect(formatStoryArtist(undefined)).toBe('')
  })
})
