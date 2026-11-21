import { describe, expect, vi, beforeEach } from 'vitest'

import { fireEvent, render, screen, it } from 'test/test-utils'

import { ContestCommentsSection } from './ContestCommentsSection'

const mocks = vi.hoisted(() => ({
  useCurrentUserId: vi.fn(),
  useEventComments: vi.fn(),
  usePostEventComment: vi.fn(),
  useComment: vi.fn(),
  useUser: vi.fn()
}))

vi.mock('@audius/common/api', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useCurrentUserId: mocks.useCurrentUserId,
    useEventComments: mocks.useEventComments,
    usePostEventComment: mocks.usePostEventComment,
    useComment: mocks.useComment,
    useUser: mocks.useUser
  }
})

vi.mock('components/link/UserLink', () => ({
  UserLink: ({ userId }: { userId: number }) => (
    <span data-testid='user-link'>user-{userId}</span>
  )
}))

const EVENT_ID = 100
const EVENT_OWNER_ID = 1
const OTHER_USER_ID = 2

const artistComment = {
  id: 500,
  userId: EVENT_OWNER_ID,
  entityId: EVENT_ID,
  entityType: 'Event' as const,
  message: 'New stems dropped — go remix!',
  mentions: [],
  reactCount: 0,
  replyCount: 0,
  replies: undefined,
  isEdited: false,
  isMembersOnly: false,
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: undefined,
  trackTimestampS: undefined,
  parentCommentId: undefined
}

const fanComment = {
  ...artistComment,
  id: 501,
  userId: OTHER_USER_ID,
  message: "can't wait to submit"
}

const artistReply = {
  ...artistComment,
  id: 502,
  userId: EVENT_OWNER_ID,
  message: 'thanks for joining!',
  parentCommentId: 501
}

const ownerUser = {
  user_id: EVENT_OWNER_ID,
  handle: 'Protohype',
  name: 'Protohype'
}
const fanUser = { user_id: OTHER_USER_ID, handle: 'remixer', name: 'Remixer' }

describe('ContestCommentsSection', () => {
  let mutate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mutate = vi.fn()
    mocks.useCurrentUserId.mockReturnValue({ data: OTHER_USER_ID })
    mocks.useEventComments.mockReturnValue({
      data: [],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    mocks.usePostEventComment.mockReturnValue({
      mutate,
      isPending: false
    })
    mocks.useComment.mockImplementation((id: number) => {
      if (id === 500) return { data: artistComment }
      if (id === 501) return { data: fanComment }
      if (id === 502) return { data: artistReply }
      return { data: undefined }
    })
    mocks.useUser.mockImplementation((id: number) => {
      if (id === EVENT_OWNER_ID) return { data: ownerUser }
      if (id === OTHER_USER_ID) return { data: fanUser }
      return { data: undefined }
    })
  })

  it('shows "Sign in to comment" and hides the compose box when not authed', () => {
    mocks.useCurrentUserId.mockReturnValue({ data: null })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByText(/sign in to comment/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^post$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Post Update' })
    ).not.toBeInTheDocument()
  })

  it('shows a "Post" button for a signed-in non-owner', () => {
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Post Update' })
    ).not.toBeInTheDocument()
  })

  it('shows a "Post Update" button for the event owner', () => {
    mocks.useCurrentUserId.mockReturnValue({ data: EVENT_OWNER_ID })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(
      screen.getByRole('button', { name: 'Post Update' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^post$/i })
    ).not.toBeInTheDocument()
  })

  it('disables the submit button when the draft is empty or whitespace', () => {
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    const submit = screen.getByRole('button', { name: /^post$/i })
    expect(submit).toBeDisabled()

    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '   ' } })
    expect(submit).toBeDisabled()
  })

  it('calls the post mutation with eventId + trimmed body when submitted', () => {
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: '  gm contestants  ' } })
    const submit = screen.getByRole('button', { name: /^post$/i })
    expect(submit).not.toBeDisabled()
    fireEvent.click(submit)

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith({
      userId: OTHER_USER_ID,
      eventId: EVENT_ID,
      body: 'gm contestants'
    })
  })

  it('clears the draft after submit so the compose box is ready for the next comment', () => {
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.click(screen.getByRole('button', { name: /^post$/i }))
    expect(input.value).toBe('')
  })

  it('shows an empty state when the feed has no comments', () => {
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByText(/^nothing here yet$/i)).toBeInTheDocument()
  })

  it('shows a loading spinner while the feed is pending', () => {
    mocks.useEventComments.mockReturnValue({
      data: undefined,
      isPending: true,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.queryByText(/no posts yet/i)).not.toBeInTheDocument()
  })

  const BADGE_TEXT = 'Post Update'

  it('shows a Post Update badge on a top-level comment by the event owner', () => {
    mocks.useEventComments.mockReturnValue({
      data: [{ commentId: artistComment.id }],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByText(artistComment.message)).toBeInTheDocument()
    expect(screen.getByText(BADGE_TEXT)).toBeInTheDocument()
  })

  it('does NOT show a Post Update badge on a comment by a non-owner', () => {
    mocks.useEventComments.mockReturnValue({
      data: [{ commentId: fanComment.id }],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByText(fanComment.message)).toBeInTheDocument()
    expect(screen.queryByText(BADGE_TEXT)).not.toBeInTheDocument()
  })

  it('does NOT show a Post Update badge on a REPLY authored by the event owner', () => {
    mocks.useEventComments.mockReturnValue({
      data: [{ commentId: artistReply.id }],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByText(artistReply.message)).toBeInTheDocument()
    expect(screen.queryByText(BADGE_TEXT)).not.toBeInTheDocument()
  })

  it('omits the Post Update badge when the event owner is unknown', () => {
    mocks.useEventComments.mockReturnValue({
      data: [{ commentId: artistComment.id }],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection eventId={EVENT_ID} eventOwnerUserId={undefined} />
    )
    expect(screen.getByText(artistComment.message)).toBeInTheDocument()
    expect(screen.queryByText(BADGE_TEXT)).not.toBeInTheDocument()
  })

  it('shows a Load more button that calls fetchNextPage when there is another page', () => {
    const fetchNextPage = vi.fn()
    mocks.useEventComments.mockReturnValue({
      data: [{ commentId: fanComment.id }],
      isPending: false,
      hasNextPage: true,
      fetchNextPage,
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    const loadMore = screen.getByRole('button', { name: /load more/i })
    fireEvent.click(loadMore)
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('hides the Load more button when there is no next page', () => {
    mocks.useEventComments.mockReturnValue({
      data: [{ commentId: fanComment.id }],
      isPending: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      isFetchingNextPage: false
    })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(
      screen.queryByRole('button', { name: /load more/i })
    ).not.toBeInTheDocument()
  })
})
