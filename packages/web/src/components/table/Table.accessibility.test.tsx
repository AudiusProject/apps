import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from 'test/test-utils'

import { Table } from './Table'

vi.mock('@audius/common/hooks', async () => {
  const actual = await vi.importActual<any>('@audius/common/hooks')
  return {
    ...actual,
    useGatedContentAccessMap: () => ({})
  }
})

const columns = [
  {
    Header: 'Title',
    accessor: 'title',
    id: 'title',
    width: 120
  },
  {
    Header: 'Plays',
    accessor: 'plays',
    id: 'plays',
    width: 80
  }
]

const data = [
  { id: 'one', title: 'Track One', plays: 1 },
  { id: 'two', title: 'Track Two', plays: 2 }
]

describe('Table accessibility', () => {
  it('keeps clickable rows out of the tab order while preserving mouse click', () => {
    const handleClickRow = vi.fn()
    render(<Table columns={columns} data={data} onClickRow={handleClickRow} />)

    const row = screen.getByRole('row', { name: /track one/i })
    expect(row).not.toHaveAttribute('tabindex')

    fireEvent.click(row)
    fireEvent.keyDown(row, { key: 'Enter' })
    fireEvent.keyDown(row, { key: ' ' })

    expect(handleClickRow).toHaveBeenCalledTimes(1)
  })

  it('keeps sortable headers and table controls in the tab order', () => {
    render(<Table columns={columns} data={data} showMoreLimit={1} />)

    const sortButton = screen.getByRole('button', { name: 'Sort by Title' })
    sortButton.focus()
    expect(sortButton).toHaveFocus()

    const showMoreButton = screen.getByRole('button', { name: /show more/i })
    showMoreButton.focus()
    expect(showMoreButton).toHaveFocus()
  })

  it('keeps pagination controls in the tab order', () => {
    render(
      <Table
        columns={columns}
        data={data}
        isPaginated
        totalRowCount={4}
        pageSize={1}
      />
    )

    const nextPageButton = screen.getByRole('button', { name: 'Next page' })
    nextPageButton.focus()
    expect(nextPageButton).toHaveFocus()
  })
})
