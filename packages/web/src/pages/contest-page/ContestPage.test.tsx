import { createRef, type RefObject } from 'react'

import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, vi, beforeEach } from 'vitest'

import { render, screen, it } from 'test/test-utils'

import ContestPage from './ContestPage'

const mocks = vi.hoisted(() => ({
  useTrackByPermalink: vi.fn(),
  useUser: vi.fn(),
  useRemixContest: vi.fn(),
  useCurrentUserId: vi.fn(),
  useEventFollowState: vi.fn(),
  useFollowEvent: vi.fn(),
  useUnfollowEvent: vi.fn(),
  useRemixesLineup: vi.fn(),
  useRemixesCount: vi.fn(),
  useRemixersCount: vi.fn(),
  useComment: vi.fn(),
  useEventComments: vi.fn(),
  usePostEventComment: vi.fn()
}))

vi.mock('@audius/common/api', async (importOriginal) => {
  const actual = (await importOriginal()) as object
  return {
    ...actual,
    useTrackByPermalink: mocks.useTrackByPermalink,
    useUser: mocks.useUser,
    useRemixContest: mocks.useRemixContest,
    useCurrentUserId: mocks.useCurrentUserId,
    useEventFollowState: mocks.useEventFollowState,
    useFollowEvent: mocks.useFollowEvent,
    useUnfollowEvent: mocks.useUnfollowEvent,
    useRemixesLineup: mocks.useRemixesLineup,
    useRemixesCount: mocks.useRemixesCount,
    useRemixersCount: mocks.useRemixersCount,
    useComment: mocks.useComment,
    useEventComments: mocks.useEventComments,
    usePostEventComment: mocks.usePostEventComment
  }
})

vi.mock('hooks/useRequiresAccount', async () => {
  return {
    useRequiresAccountCallback: (cb: (...args: any) => any) => cb
  }
})

vi.mock('components/lineup/TanQueryLineup', () => ({
  TanQueryLineup: () => <div data-testid='tan-query-lineup' />
}))

vi.mock('./components/ContestCommentsTile', () => ({
  ContestCommentsTile: () => <div data-testid='contest-comments-section' />
}))

const track = {
  track_id: 1,
  owner_id: 1,
  title: 'Ready To Love',
  permalink: '/Protohype/ready-to-love',
  is_delete: false,
  is_unlisted: false
}

const user = { user_id: 1, handle: 'Protohype', name: 'Protohype' }

const contest = {
  eventId: 100,
  userId: 1,
  eventType: 'RemixContest',
  entityType: 'Track',
  entityId: 1,
  endDate: '2099-12-31T23:59:00Z',
  eventData: {
    description: 'Remix my track',
    prizeInfo: 'Cash prizes for the top three!',
    winners: []
  }
}

const renderContestPage = () => {
  const containerRef = createRef<HTMLDivElement>()
  return render(
    <MemoryRouter initialEntries={['/Protohype/contest/ready-to-love']}>
      <Routes>
        <Route
          path='/:handle/contest/:slug'
          element={
            <ContestPage
              containerRef={containerRef as RefObject<HTMLDivElement>}
            />
          }
        />
        {/* '/' route for any Navigate targets that tests may add later. */}
        <Route path='/' element={<div data-testid='home-page' />} />
      </Routes>
    </MemoryRouter>,
    {
      skipRouter: true
    }
  )
}

describe('ContestPage', () => {
  beforeEach(() => {
    mocks.useTrackByPermalink.mockReturnValue({ data: track })
    mocks.useUser.mockReturnValue({ data: user })
    mocks.useRemixContest.mockReturnValue({ data: contest })
    mocks.useCurrentUserId.mockReturnValue({ data: 2 })
    mocks.useEventFollowState.mockReturnValue({
      data: { isFollowed: false, followerCount: 0 }
    })
    mocks.useFollowEvent.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    })
    mocks.useUnfollowEvent.mockReturnValue({
      mutate: vi.fn(),
      isPending: false
    })
    mocks.useRemixesLineup.mockReturnValue({
      data: undefined,
      isFetching: false,
      isPending: false,
      isError: false,
      hasNextPage: false,
      play: vi.fn(),
      pause: vi.fn(),
      loadNextPage: vi.fn(),
      isPlaying: false,
      lineup: { entries: [], order: {} }
    })
    mocks.useRemixersCount.mockReturnValue({ data: 0 })
    mocks.useRemixesCount.mockReturnValue({ data: 0 })
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
  })

  it('renders nothing while the track is still loading', () => {
    mocks.useTrackByPermalink.mockReturnValue({ data: undefined })
    mocks.useUser.mockReturnValue({ data: undefined })
    const { container } = renderContestPage()
    expect(container.querySelector('[data-testid="details-tab"]')).toBeNull()
    expect(container.querySelector('[data-testid="prizes-tab"]')).toBeNull()
  })

  it('renders the skeleton fallback when the track has no remix contest', () => {
    mocks.useRemixContest.mockReturnValue({ data: null })
    const { container } = renderContestPage()
    expect(container.querySelector('[aria-busy]')).not.toBeNull()
    expect(screen.queryByText(/^about this contest$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^prizes$/i)).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('contest-comments-section')
    ).not.toBeInTheDocument()
  })

  it('renders the details / prizes / submissions / feed sections when a contest exists', () => {
    mocks.useRemixesLineup.mockReturnValue({
      data: [{ id: 1 }, { id: 2 }],
      isFetching: false,
      isPending: false,
      isError: false,
      hasNextPage: false,
      play: vi.fn(),
      pause: vi.fn(),
      loadNextPage: vi.fn(),
      isPlaying: false,
      lineup: { entries: [], order: {} }
    })
    mocks.useRemixesCount.mockReturnValue({ data: 1 })
    renderContestPage()

    expect(screen.getByText(/^about this contest$/i)).toBeInTheDocument()
    expect(screen.getByText(/^prizes$/i)).toBeInTheDocument()

    expect(
      screen.getByRole('button', { name: /^submissions( \(\d+\))?$/i })
    ).toBeInTheDocument()

    expect(screen.getAllByTestId('contest-comments-section')).toHaveLength(2)
    expect(screen.queryByTestId('tan-query-lineup')).not.toBeInTheDocument()
  })

  it('renders "Follow" when the viewer is NOT already following', () => {
    mocks.useEventFollowState.mockReturnValue({
      data: { isFollowed: false, followerCount: 12 }
    })
    renderContestPage()

    expect(
      screen.getByRole('button', { name: /^follow$/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^following$/i })
    ).not.toBeInTheDocument()
  })

  it('renders "Following" when the viewer is already subscribed to the contest', () => {
    mocks.useEventFollowState.mockReturnValue({
      data: { isFollowed: true, followerCount: 13 }
    })
    renderContestPage()

    expect(
      screen.getByRole('button', { name: /^following$/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^follow$/i })
    ).not.toBeInTheDocument()
  })

  it('does not flash "Follow" while the follow state is still loading', () => {
    mocks.useEventFollowState.mockReturnValue({
      data: undefined,
      isPending: true
    })
    renderContestPage()

    expect(
      screen.queryByRole('button', { name: /^follow$/i })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^following$/i })
    ).not.toBeInTheDocument()
  })

  it('includes the track title in the page header when the contest is attached to a track', () => {
    renderContestPage()
    expect(
      screen.getByText(/Ready To Love\s+Remix Contest/i)
    ).toBeInTheDocument()
  })
})
