import { describe, expect, it } from 'vitest'

import { mergeGenreSuggestions, normalizeGenre } from './genres'

describe('genre suggestions', () => {
  it('normalizes whitespace and casing for community genres', () => {
    expect(normalizeGenre('  afro   beat  ')).toBe('Afro Beat')
    expect(normalizeGenre('UK GARAGE')).toBe('UK Garage')
  })

  it('dedupes obvious duplicate formatting and keeps the strongest count', () => {
    const suggestions = mergeGenreSuggestions(
      [
        { label: 'hip hop', value: 'hip hop', count: 12 },
        { label: 'hip-hop', value: 'hip-hop', count: 5 },
        { label: 'Afro Beat', value: 'Afro Beat', count: 4 }
      ],
      []
    )

    expect(suggestions).toEqual([
      { label: 'Hip Hop', value: 'Hip Hop', count: 12 },
      { label: 'Afro Beat', value: 'Afro Beat', count: 4 }
    ])
  })

  it('uses the static genre value when a community genre has the same key', () => {
    const suggestions = mergeGenreSuggestions(
      [{ label: 'Lo Fi', value: 'Lo Fi', count: 12 }],
      [{ label: 'Lo-Fi', value: 'Lo-Fi' }]
    )

    expect(suggestions).toEqual([{ label: 'Lo-Fi', value: 'Lo-Fi', count: 12 }])
  })
})
