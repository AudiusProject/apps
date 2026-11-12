import { StemCategory, StemUploadWithFile } from '@audius/common/models'
import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen, within } from 'test/test-utils'

import { StemFilesView } from './StemFilesView'

const makeStem = (
  name: string,
  overrides: Partial<StemUploadWithFile> = {}
): StemUploadWithFile =>
  ({
    file: new File(['x'], name, { type: 'audio/wav' }),
    metadata: { orig_filename: name },
    category: null,
    allowCategorySwitch: true,
    allowDelete: true,
    ...overrides
  }) as unknown as StemUploadWithFile

const renderView = (stems: StemUploadWithFile[]) => {
  const onSelectCategoryForStems = vi.fn()
  render(
    <StemFilesView
      stems={stems}
      onAddStems={vi.fn()}
      onSelectCategory={vi.fn()}
      onSelectCategoryForStems={onSelectCategoryForStems}
      onDeleteStem={vi.fn()}
    />
  )
  return { onSelectCategoryForStems }
}

const pickType = async (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Set Type' }))
  const menu = await screen.findByRole('listbox')
  fireEvent.click(within(menu).getByText(label))
}

describe('StemFilesView bulk type', () => {
  it('sets the type on every selected stem', async () => {
    const { onSelectCategoryForStems } = renderView([
      makeStem('riser.wav'),
      makeStem('vocal.wav'),
      makeStem('sfx.wav')
    ])

    expect(screen.getByRole('button', { name: 'Set Type' })).toBeDisabled()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select riser.wav' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select sfx.wav' }))
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    await pickType('Other')

    expect(onSelectCategoryForStems).toHaveBeenCalledWith(
      StemCategory.OTHER,
      [0, 2]
    )
    expect(screen.getByText('Select all')).toBeInTheDocument()
  })

  it('select all skips stems whose type is locked', async () => {
    const { onSelectCategoryForStems } = renderView([
      makeStem('a.wav'),
      makeStem('b.wav', { allowCategorySwitch: false }),
      makeStem('c.wav')
    ])

    expect(
      screen.queryByRole('checkbox', { name: 'Select b.wav' })
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all' }))
    await pickType('Other')

    expect(onSelectCategoryForStems).toHaveBeenCalledWith(
      StemCategory.OTHER,
      [0, 2]
    )
  })

  it('hides selection for a single stem', () => {
    renderView([makeStem('only.wav')])
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })
})
