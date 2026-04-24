import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from 'test/test-utils'

import { CoinRow } from './CoinCard'

describe('CoinRow accessibility', () => {
  it('keeps the row out of the tab order and exposes the caret action', () => {
    const handleClick = vi.fn()
    const { container } = render(
      <CoinRow
        icon={<span />}
        name='Test Coin'
        symbol='TEST'
        dollarValue='$1.00'
        onClick={handleClick}
        actionLabel='View Test Coin asset details'
      />
    )

    expect(container.querySelector('[tabindex="0"]')).not.toBeInTheDocument()

    const action = screen.getByRole('button', {
      name: 'View Test Coin asset details'
    })
    fireEvent.click(action)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
