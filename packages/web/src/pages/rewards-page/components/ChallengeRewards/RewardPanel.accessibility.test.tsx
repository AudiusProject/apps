import type { ComponentProps } from 'react'

import { ChallengeName } from '@audius/common/models'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from 'test/test-utils'

import { RewardPanel } from './RewardPanel'

vi.mock('@audius/common/api', async () => {
  const actual = await vi.importActual<any>('@audius/common/api')
  return {
    ...actual,
    useCurrentAccount: () => ({ data: null }),
    useCurrentAccountUser: () => ({ data: null })
  }
})

vi.mock('@audius/common/hooks', async () => {
  const actual = await vi.importActual<any>('@audius/common/hooks')
  return {
    ...actual,
    useFormattedProgressLabel: () => ''
  }
})

vi.mock('react-redux', async () => {
  const actual = await vi.importActual<any>('react-redux')
  return {
    ...actual,
    useSelector: () => ({})
  }
})

const renderRewardPanel = (
  props: Partial<ComponentProps<typeof RewardPanel>> = {}
) => {
  const openModal = vi.fn()
  render(
    <MemoryRouter>
      <RewardPanel
        id={ChallengeName.ListenStreak}
        title='Locked Reward'
        description={() => 'Reward description'}
        openModal={openModal}
        {...props}
      />
    </MemoryRouter>,
    { skipRouter: true }
  )
  return { openModal }
}

describe('RewardPanel accessibility', () => {
  it('keeps locked panels out of the button tab path', () => {
    const { openModal } = renderRewardPanel({ isLocked: true })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Locked Reward'))
    expect(openModal).not.toHaveBeenCalled()
  })

  it('keeps available panels interactive', () => {
    const { openModal } = renderRewardPanel()

    fireEvent.click(screen.getByRole('button'))
    expect(openModal).toHaveBeenCalledWith(ChallengeName.ListenStreak)
  })
})
