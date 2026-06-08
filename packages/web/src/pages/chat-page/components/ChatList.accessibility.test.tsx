import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from 'test/test-utils'

import { ChatListBlastItem } from './ChatListBlastItem'
import { ChatListItem } from './ChatListItem'

vi.mock('@audius/common/api', async () => {
  const actual = await vi.importActual<any>('@audius/common/api')
  return {
    ...actual,
    useOtherChatUsersFromChat: () => [
      {
        user_id: 1,
        name: 'Test User',
        handle: 'test-user'
      }
    ]
  }
})

vi.mock('@audius/common/hooks', async () => {
  const actual = await vi.importActual<any>('@audius/common/hooks')
  return {
    ...actual,
    useChatBlastAudienceContent: () => ({
      chatBlastTitle: 'Message Blast',
      contentTitle: 'Latest Drop',
      audienceCount: 12
    })
  }
})

vi.mock('components/user-badges/UserBadges', () => ({
  default: ({ disableInteraction }: { disableInteraction?: boolean }) => (
    <span
      data-disable-interaction={disableInteraction ? 'true' : 'false'}
      data-testid='user-badges'
    />
  )
}))

describe('Chat list accessibility', () => {
  it('uses a single native button for user chat rows', () => {
    const handleClick = vi.fn()
    render(
      <ChatListItem
        chat={
          {
            chat_id: 'chat-1',
            last_message: 'Hello',
            unread_message_count: 0
          } as any
        }
        currentChatId='chat-1'
        onChatClicked={handleClick}
      />
    )

    const row = screen.getByRole('button', { name: /test user/i })
    expect(row).toHaveAttribute('aria-current', 'page')
    expect(screen.getByTestId('user-badges')).toHaveAttribute(
      'data-disable-interaction',
      'true'
    )

    fireEvent.click(row)
    expect(handleClick).toHaveBeenCalledWith('chat-1')
  })

  it('uses a single native button for chat blast rows', () => {
    const handleClick = vi.fn()
    render(
      <ChatListBlastItem
        chat={{ chat_id: 'blast-1' } as any}
        currentChatId='other-chat'
        onChatClicked={handleClick}
      />
    )

    const row = screen.getByRole('button', { name: /message blast/i })
    expect(row).not.toHaveAttribute('aria-current')

    fireEvent.click(row)
    expect(handleClick).toHaveBeenCalledWith('blast-1')
  })
})
