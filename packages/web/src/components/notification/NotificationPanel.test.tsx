import { createRef, type ReactNode } from 'react'

import { useNotifications } from '@audius/common/api'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NotificationPanel } from './NotificationPanel'

vi.mock('@audius/common/api', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationsAsViewed: () => ({ mutate: vi.fn() })
}))

vi.mock('react-redux', () => ({ useSelector: () => false }))

vi.mock('@audius/harmony', () => ({
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Scrollbar: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Flex: ({ children, role }: { children: ReactNode; role?: string }) => (
    <div role={role}>{children}</div>
  ),
  Text: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Button: (props: React.ComponentProps<'button'>) => <button {...props} />,
  LoadingSpinner: (props: { 'aria-label'?: string }) => (
    <div role='progressbar' aria-label={props['aria-label']} />
  ),
  IconNotificationOn: () => null,
  useTheme: () => ({ spacing: { s: 8, l: 16, xl: 24 } })
}))

vi.mock('react-infinite-scroller', () => ({
  default: ({
    children,
    hasMore,
    loadMore,
    loader
  }: {
    children: ReactNode
    hasMore?: boolean
    loadMore: () => void
    loader?: ReactNode
  }) => (
    <ul>
      {children}
      {hasMore ? loader : null}
      <button onClick={loadMore}>Load more</button>
    </ul>
  )
}))

vi.mock('./Notification', () => ({
  Notification: () => <li>Existing notification</li>
}))

vi.mock('store/application/ui/userListModal/selectors', () => ({
  getIsOpen: () => false
}))

const query = {
  notifications: [],
  fetchNextPage: vi.fn(),
  refetch: vi.fn(),
  hasNextPage: false,
  isPending: false,
  isError: false,
  isFetching: false,
  isFetchingNextPage: false
}

const renderPanel = (overrides: Record<string, unknown> = {}) => {
  vi.mocked(useNotifications).mockReturnValue({ ...query, ...overrides } as any)
  return render(
    <NotificationPanel
      anchorRef={createRef<HTMLButtonElement>()}
      isOpen
      onClose={vi.fn()}
    />
  )
}

describe('NotificationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(cleanup)

  it('shows a spinner before the first page has loaded', () => {
    renderPanel({ isPending: true, isFetching: true, hasNextPage: undefined })

    expect(
      screen.getByRole('progressbar', { name: 'Loading notifications' })
    ).toBeTruthy()
    expect(screen.queryByText('There’s Nothing Here Yet!')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(query.fetchNextPage).not.toHaveBeenCalled()
  })

  it('shows an error and retries a failed initial request', () => {
    renderPanel({ isError: true })

    expect(screen.getByRole('alert').textContent).toContain(
      'Unable to load notifications'
    )
    expect(screen.queryByText('There’s Nothing Here Yet!')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))
    expect(query.refetch).toHaveBeenCalledOnce()
  })

  it('shows the empty state only after a successful empty response', () => {
    renderPanel()

    expect(screen.getByText('There’s Nothing Here Yet!')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('keeps loaded notifications visible when a later request fails', () => {
    renderPanel({
      notifications: [{ id: 'existing' }],
      isError: true,
      isFetching: true,
      hasNextPage: true
    })

    expect(screen.getByText('Existing notification')).toBeTruthy()
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Try Again' })
        .disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(query.fetchNextPage).not.toHaveBeenCalled()
  })

  it('loads more only when there is another page and no request is in flight', () => {
    renderPanel({ notifications: [{ id: 'existing' }], hasNextPage: true })
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(query.fetchNextPage).toHaveBeenCalledOnce()
  })

  it('shows pagination loading and prevents overlapping requests', () => {
    renderPanel({
      notifications: [{ id: 'existing' }],
      hasNextPage: true,
      isFetching: true,
      isFetchingNextPage: true
    })

    expect(screen.getByText('Existing notification')).toBeTruthy()
    expect(screen.getByRole('progressbar')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }))
    expect(query.fetchNextPage).not.toHaveBeenCalled()
  })
})
