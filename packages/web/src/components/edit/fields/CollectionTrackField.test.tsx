import { Formik } from 'formik'
import { describe, expect, vi } from 'vitest'

import { fireEvent, render, screen, it } from 'test/test-utils'

import { CollectionTrackField } from './CollectionTrackField'

// The genre field fetches community suggestions; the static list is enough here.
vi.mock('@audius/common/api', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useGenreSuggestions: () => ({ data: undefined })
  }
})

type Values = {
  isUpload: boolean
  trackDetails: { genre: string | null; mood: string | null; tags: string }
  tracks: {
    override: boolean
    metadata: {
      track_id: number
      title: string
      genre: string
      mood: string | null
      tags: string | null
    }
  }[]
}

const renderField = (isUpload = true) => {
  const onValues = vi.fn()
  const initialValues: Values = {
    isUpload,
    trackDetails: { genre: 'Rock', mood: 'Peaceful', tags: '' },
    tracks: [
      {
        override: false,
        metadata: {
          track_id: 1,
          title: 'Opening Theme',
          genre: '',
          mood: null,
          tags: null
        }
      }
    ]
  }
  render(
    <Formik initialValues={initialValues} onSubmit={() => {}}>
      {({ values }) => {
        onValues(values)
        return (
          <CollectionTrackField index={0} remove={() => {}} disableDelete />
        )
      }}
    </Formik>
  )
  return { latestValues: () => onValues.mock.lastCall?.[0] as Values }
}

describe('CollectionTrackField', () => {
  it('hides the per-track fields until the override is turned on', () => {
    renderField()
    expect(
      screen.getByRole('checkbox', { name: /custom genre & mood/i })
    ).not.toBeChecked()
    expect(screen.queryByRole('combobox', { name: /^genre$/i })).toBeNull()
  })

  it('prefills the track with the collection defaults when overridden', async () => {
    const { latestValues } = renderField()

    fireEvent.click(
      screen.getByRole('checkbox', { name: /custom genre & mood/i })
    )

    expect(
      await screen.findByRole('combobox', { name: /^genre$/i })
    ).toHaveValue('Rock')
    expect(latestValues().tracks[0].override).toBe(true)
    expect(latestValues().tracks[0].metadata.genre).toBe('Rock')
    expect(latestValues().tracks[0].metadata.mood).toBe('Peaceful')
  })

  it('clears the track genre when the override is turned back off', async () => {
    const { latestValues } = renderField()
    const toggle = screen.getByRole('checkbox', {
      name: /custom genre & mood/i
    })

    fireEvent.click(toggle)
    await screen.findByRole('combobox', { name: /^genre$/i })
    fireEvent.click(toggle)

    expect(screen.queryByRole('combobox', { name: /^genre$/i })).toBeNull()
    expect(latestValues().tracks[0].metadata.genre).toBe('')
    expect(latestValues().tracks[0].metadata.mood).toBeNull()
  })

  it('does not offer the override when editing an existing collection', () => {
    renderField(false)
    expect(
      screen.queryByRole('checkbox', { name: /custom genre & mood/i })
    ).toBeNull()
  })
})
