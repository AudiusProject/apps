import { describe, expect, it, vi } from 'vitest'

import { render, screen, waitFor } from 'test/test-utils'

import { ShareDialog } from './ShareDialog'

const props = {
  isOpen: true,
  isOwner: false,
  onShareToDirectMessage: vi.fn(),
  onShareToX: vi.fn(),
  onCopyLink: vi.fn(),
  onEmbed: vi.fn(),
  onClose: vi.fn(),
  onClosed: vi.fn(),
  shareType: 'track' as const,
  isPrivate: false
}

describe('ShareDialog accessibility', () => {
  it('moves initial modal focus to the first share action', async () => {
    render(<ShareDialog {...props} />)

    const directMessageButton = await screen.findByRole('button', {
      name: 'Direct Message'
    })

    await waitFor(() => expect(directMessageButton).toHaveFocus())
  })

  it('focuses the X action first when direct messages are unavailable', async () => {
    render(<ShareDialog {...props} onShareToDirectMessage={undefined} />)

    const xButton = await screen.findByRole('button', { name: 'Share to X' })

    await waitFor(() => expect(xButton).toHaveFocus())
  })
})
