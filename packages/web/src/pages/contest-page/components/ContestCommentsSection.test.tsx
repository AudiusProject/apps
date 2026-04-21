import { describe, expect, vi, beforeEach } from 'vitest'

import { fireEvent, render, screen, it } from 'test/test-utils'

// Must import after mocks are set up.
import { ContestCommentsSection } from './ContestCommentsSection'

// ContestCommentsSection stitches four hooks together:
//   - useCurrentUserId         → who's looking at the page
//   - useEventComments         → the feed (top-level comments + nested replies)
//   - usePostEventComment      → the compose-box mutation
//   - useComment / useUser     → fan-out for each rendered card
//
// We mock them collectively so each test case can assert on one rendering
// invariant without standing up the full SDK + batcher stack.

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

// UserLink navigates to the profile page via a deeply-wired hook stack.
// We only care here that *something* representing the author renders.
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
  // No parentCommentId → top-level
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
  parentCommentId: 501 // REPLY, not top-level
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

  // -----------------------------------------------------------------------
  // COMPOSE
  // -----------------------------------------------------------------------

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
    // Case-sensitive exact match so we don't pick up the subheading text
    // "Post updates from the artist…" (lowercase 'u').
    expect(
      screen.queryByRole('button', { name: 'Post Update' })
    ).not.toBeInTheDocument()
  })

  it('shows a "Post" button for a signed-in non-owner', () => {
    // OTHER_USER_ID is the current user via beforeEach default.
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    // Submit label is "Post", not "Post Update" — this distinguishes fan vs
    // artist compose modes reliably without depending on Harmony's floating
    // placeholder implementation.
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Post Update' })
    ).not.toBeInTheDocument()
  })

  it('shows a "Post Update" button for the event owner', () => {
    // When the current user IS the event owner, compose mode flips.
    mocks.useCurrentUserId.mockReturnValue({ data: EVENT_OWNER_ID })
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    // Exact-case match — the subheading "Post updates from…" should not match.
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

    // Whitespace-only draft should stay disabled (the handler trims before
    // checking — prevents accidentally posting blank comments).
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

  // -----------------------------------------------------------------------
  // FEED
  // -----------------------------------------------------------------------

  it('shows an empty state when the feed has no comments', () => {
    render(
      <ContestCommentsSection
        eventId={EVENT_ID}
        eventOwnerUserId={EVENT_OWNER_ID}
      />
    )
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument()
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
    // Empty state MUST NOT render while still loading.
    expect(screen.queryByText(/no posts yet/i)).not.toBeInTheDocument()
  })

  // -----------------------------------------------------------------------
  // POST UPDATE BADGE — the central semantic invariant of Phase 4
  // -----------------------------------------------------------------------

  // Badge text is rendered as exact "Post Update" in a <span>. The
  // subheading "Post updates from the artist…" uses lowercase 'u' and would
  // match a case-insensitive regex, so we match case-sensitively throughout.
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
    // Current user is a fan (not the owner), so no compose-side "Post Update"
    // button is present; the only "Post Update" text in the page is the badge.
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
    // This is the invariant the Python backend test enforces too:
    // only top-level comments by the event owner count as post updates.
    // A reply by the artist is just a normal reply.
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
    // If eventOwnerUserId is undefined (event hasn't loaded yet), we must
    // not label arbitrary comments as post updates.
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

  // -----------------------------------------------------------------------
  // PAGINATION
  // -----------------------------------------------------------------------

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
