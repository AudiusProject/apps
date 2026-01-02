import { dayjs } from '@audius/common/utils'
import { Form, Formik } from 'formik'
import { merge } from 'lodash'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved
} from 'test/test-utils'

import { VisibilityField } from './VisibilityField'

const submitSpy = vi.fn()

const renderTrackVisibilityField = (options?: { initialValues: any }) => {
  const now = new Date(2024, 5, 14)
  vi.setSystemTime(now)
  const { initialValues } = options ?? {}

  const defaultInitialValues = {
    trackMetadatasIndex: 0,
    trackMetadatas: [
      {
        is_unlisted: true,
        is_scheduled_release: false
      }
    ]
  }

  return render(
    <Formik
      initialValues={merge(defaultInitialValues, initialValues)}
      onSubmit={submitSpy}
    >
      <Form>
        <VisibilityField entityType='track' isUpload={false} />
        <button type='submit'>Submit</button>
      </Form>
    </Formik>
  )
}

// Skipping this test suite because it requires app context provider
// which is a bit annoying to add at this moment.
// There will be work done later to make this easier to test.
describe.skip('VisibilityField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    submitSpy.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders visibility field with "public" initial value', () => {
    renderTrackVisibilityField({
      initialValues: { trackMetadatas: [{ is_unlisted: false }] }
    })

    expect(
      screen.getByRole('heading', { name: 'Visibility' })
    ).toBeInTheDocument()

    expect(
      screen.getByText(
        'Change the visibility of this release or schedule it to release in the future.'
      )
    ).toBeInTheDocument()

    expect(screen.getByLabelText(/public/i)).toBeInTheDocument()
  })

  it('clicking opens a dialog with visibility options', () => {
    renderTrackVisibilityField()

    expect(
      screen.getByRole('button', { name: /visibility/i })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /visibility/i }))

    expect(
      screen.getByRole('dialog', { name: /visibility/i })
    ).toBeInTheDocument()

    expect(screen.getByRole('radio', { name: /public/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /hidden/i })).toBeInTheDocument()
    expect(
      screen.getByRole('radio', { name: /scheduled release/i })
    ).toBeInTheDocument()
  })

  it('can set track entity as unlisted', async () => {
    renderTrackVisibilityField()

    expect(
      screen.getByRole('button', { name: /visibility/i })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /visibility/i }))

    fireEvent.click(screen.getByRole('radio', { name: /hidden/i }))

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'))

    expect(await screen.findByLabelText(/hidden/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          trackMetadatas: [
            {
              is_scheduled_release: false,
              is_unlisted: true,
              release_date: ''
            }
          ]
        }),
        expect.anything()
      )
    })
  })

  it('can set as a scheduled release', async () => {
    renderTrackVisibilityField()

    fireEvent.click(screen.getByRole('button', { name: /visibility/i }))
    fireEvent.click(screen.getByRole('radio', { name: /scheduled release/i }))

    fireEvent.click(screen.getByRole('button', { name: /release date/i }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Saturday, June 15, 2024' })
    )

    fireEvent.change(screen.getByRole('textbox', { name: /time/i }), {
      target: { value: '12:01' }
    })

    expect(screen.getByRole('textbox', { name: /time/i })).toHaveValue('12:01')

    fireEvent.click(screen.getByRole('button', { name: /save/i }))

    expect(
      await screen.findByLabelText(/scheduled for tomorrow @ 12:01 am/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          trackMetadatas: [
            {
              is_scheduled_release: true,
              is_unlisted: true,
              release_date: dayjs('Sat Jun 15 2024 00:01:00').toString()
            }
          ]
        }),
        expect.anything()
      )
    })
  })
})
