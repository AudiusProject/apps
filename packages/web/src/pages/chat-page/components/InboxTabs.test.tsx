import { Status } from '@audius/common/models'
import { InboxTab } from '@audius/common/store'
import { ChatBlastAudience, ChatCategory, type UserChat } from '@audius/sdk'
import { describe, expect, it, vi } from 'vitest'

import { fireEvent, render, screen } from 'test/test-utils'

import { ChatList } from './ChatList'
import { InboxTabs } from './InboxTabs'

vi.mock('@audius/common/api', async () => {
  const actual = await vi.importActual<any>('@audius/common/api')
  return {
    ...actual,
    useOtherChatUsersFromChat: (chat: UserChat) => [
      {
        user_id: 1,
        name: `User ${chat.chat_id}`,
        handle: chat.chat_id
      }
    ]
  }
})

vi.mock('components/user-badges/UserBadges', () => ({
  default: () => null
}))

const makeChat = (
  chatId: string,
  overrides: Partial<UserChat> = {}
): UserChat => ({
  chat_id: chatId,
  last_message: `hello from ${chatId}`,
  last_message_at: '2026-01-02T00:00:00.000Z',
  last_message_is_plaintext: true,
  chat_members: [],
  recheck_permissions: false,
  invite_code: '',
  unread_message_count: 0,
  last_read_at: '2026-01-02T00:00:00.000Z',
  cleared_history_at: '1970-01-01T00:00:00.000Z',
  is_blast: false,
  audience: ChatBlastAudience.FOLLOWERS,
  category: null,
  ...overrides
})

const chats = [
  makeChat('new-chat'),
  makeChat('priority-chat', { category: ChatCategory.PRIORITY }),
  makeChat('general-chat', {
    category: ChatCategory.GENERAL,
    unread_message_count: 2
  })
]

const makeChatState = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  chats: {
    ids: chats.map((c) => c.chat_id),
    entities: Object.fromEntries(chats.map((c) => [c.chat_id, c])),
    status: Status.SUCCESS,
    summary: {
      prev_cursor: '',
      prev_count: 0,
      next_cursor: '',
      next_count: 0,
      total_count: chats.length
    }
  },
  messages: {},
  unreadMessagesCount: 2,
  optimisticChatRead: {},
  optimisticReactions: {},
  pendingChatCategoryRollback: {},
  activeChatId: null,
  blockees: [],
  blockers: [],
  permissions: {},
  permissionsStatus: Status.IDLE,
  reactionsPopupMessageId: null,
  ...overrides
})

const renderWithChats = (
  ui: React.ReactElement,
  chatOverrides: Record<string, unknown> = {}
) =>
  render(ui, {
    reduxState: { pages: { chat: makeChatState(chatOverrides) } } as any
  })

describe('Inbox tabs', () => {
  it('shows uncategorized and priority chats in the Priority tab', () => {
    renderWithChats(
      <ChatList currentTab={InboxTab.PRIORITY} onChatClicked={vi.fn()} />
    )
    expect(
      screen.getByRole('button', { name: /user new-chat/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /user priority-chat/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /user general-chat/i })
    ).not.toBeInTheDocument()
  })

  it('shows only general chats in the General tab', () => {
    renderWithChats(
      <ChatList currentTab={InboxTab.GENERAL} onChatClicked={vi.fn()} />
    )
    expect(
      screen.getByRole('button', { name: /user general-chat/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /user new-chat/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /user priority-chat/i })
    ).not.toBeInTheDocument()
  })

  it('offers to move a chat to the tab it is not in', () => {
    renderWithChats(
      <ChatList currentTab={InboxTab.PRIORITY} onChatClicked={vi.fn()} />
    )
    const optionButtons = screen.getAllByRole('button', {
      name: /conversation options/i
    })
    // one per row (new-chat, priority-chat)
    expect(optionButtons).toHaveLength(2)
    fireEvent.click(optionButtons[1])
    expect(screen.getByText('Move to General')).toBeInTheDocument()
    expect(screen.queryByText('Move to Priority')).not.toBeInTheDocument()
  })

  it('shows a purple dot only on tabs with unread messages', () => {
    renderWithChats(
      <InboxTabs currentTab={InboxTab.PRIORITY} onSelectTab={vi.fn()} />,
      {
        unreadMessagesCountByCategory: {
          priority: 0,
          general: 2,
          uncategorized: 0
        }
      }
    )
    expect(screen.getByTestId('inbox-tab-dot-general')).toBeInTheDocument()
    expect(
      screen.queryByTestId('inbox-tab-dot-priority')
    ).not.toBeInTheDocument()
  })

  it('counts uncategorized unreads towards the Priority tab dot', () => {
    renderWithChats(
      <InboxTabs currentTab={InboxTab.PRIORITY} onSelectTab={vi.fn()} />,
      {
        unreadMessagesCountByCategory: {
          priority: 0,
          general: 0,
          uncategorized: 1
        },
        // The loaded general chat is optimistically read, so only the
        // server counts drive the dots here
        optimisticChatRead: {
          'general-chat': {
            unread_message_count: 0,
            last_read_at: '2026-01-02T00:00:00.000Z'
          }
        }
      }
    )
    expect(screen.getByTestId('inbox-tab-dot-priority')).toBeInTheDocument()
    expect(
      screen.queryByTestId('inbox-tab-dot-general')
    ).not.toBeInTheDocument()
  })

  it('falls back to loaded chats for the dot when no server counts exist', () => {
    renderWithChats(
      <InboxTabs currentTab={InboxTab.PRIORITY} onSelectTab={vi.fn()} />
    )
    // general-chat has 2 unread messages in the fixture
    expect(screen.getByTestId('inbox-tab-dot-general')).toBeInTheDocument()
    expect(
      screen.queryByTestId('inbox-tab-dot-priority')
    ).not.toBeInTheDocument()
  })

  it('switches tabs', () => {
    const onSelectTab = vi.fn()
    renderWithChats(
      <InboxTabs currentTab={InboxTab.PRIORITY} onSelectTab={onSelectTab} />
    )
    fireEvent.click(screen.getByRole('radio', { name: 'General' }))
    expect(onSelectTab).toHaveBeenCalledWith(InboxTab.GENERAL)
  })
})
