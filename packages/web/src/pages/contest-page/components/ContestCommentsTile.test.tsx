import { describe, expect, vi, beforeEach } from 'vitest'

import { fireEvent, render, screen, it } from 'test/test-utils'

import { ContestCommentsTile } from './ContestCommentsTile'

const mocks = vi.hoisted(() => ({
  useCurrentUserId: vi.fn(),
  useEventComments: vi.fn(),
  usePostEventComment: vi.fn(),
  useComment: vi.fn(),
  useDeleteComment: vi.fn(),
  useReactToComment: vi.fn(),
  useUser: vi.fn(),
  useRequiresAccountCallback: vi.fn(),
  requiresAccount: vi.fn()
}))

vi.mock('@audius/common/api', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useCurrentUserId: mocks.useCurrentUserId,
    useEventComments: mocks.useEventComments,
    usePostEventComment: mocks.usePostEventComment,
    useComment: mocks.useComment,
    useDeleteComment: mocks.useDeleteComment,
    useReactToComment: mocks.useReactToComment,
    useUser: mocks.useUser
  }
})

vi.mock('hooks/useRequiresAccount', () => ({
  useRequiresAccountCallback: (callback: (...args: any[]) => any) =>
    mocks.useRequiresAccountCallback(callback)
}))

vi.mock('hooks/useProfilePicture', () => ({
  useProfilePicture: () => undefined
}))

vi.mock('components/link/UserLink', () => ({
  UserLink: ({ userId }: { userId: number }) => (
    <span data-testid='user-link'>user-{userId}</span>
  )
}))

vi.mock('components/composer-input/ComposerInput', () => ({
  ComposerInput: ({
    placeholder,
    onClick,
    readOnly
  }: {
    placeholder?: string
    onClick?: () => void
    readOnly?: boolean
  }) => (
    <textarea
      aria-label={placeholder}
      placeholder={placeholder}
      readOnly={readOnly}
      onClick={onClick}
    />
  )
}))

const EVENT_ID = 100
const EVENT_OWNER_ID = 1

describe('ContestCommentsTile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.useCurrentUserId.mockReturnValue({ data: null })
    mocks.useEventComments.mockReturnValue({
      data: [],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    mocks.usePostEventComment.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    })
    mocks.useComment.mockReturnValue({ data: undefined })
    mocks.useDeleteComment.mockReturnValue({ mutate: vi.fn() })
    mocks.useReactToComment.mockReturnValue({ mutate: vi.fn() })
    mocks.useUser.mockReturnValue({ data: undefined })
    mocks.useRequiresAccountCallback.mockImplementation(
      (callback: (...args: any[]) => any) =>
        (...args: any[]) => {
          mocks.requiresAccount()
          // eslint-disable-next-line n/no-callback-literal
          return callback(...args)
        }
    )
  })

  it('login-gates the comments composer for signed-out viewers', () => {
    render(
      <ContestCommentsTile
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
        mode='comments'
      />
    )

    const input = screen.getByRole('textbox', { name: /add a comment/i })
    expect(input).toHaveAttribute('readonly')
    expect(screen.queryByText(/sign in to comment/i)).not.toBeInTheDocument()
    expect(mocks.requiresAccount).not.toHaveBeenCalled()

    fireEvent.click(input)

    expect(mocks.requiresAccount).toHaveBeenCalledTimes(1)
  })
})
