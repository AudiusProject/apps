import { ReactNode } from 'react'

import { describe, expect, it, vi } from 'vitest'

import { render, screen } from 'test/test-utils'

import { TracksTable } from './TracksTable'

vi.mock('@audius/common/hooks', () => ({
  useGatedContentAccessMap: () => ({})
}))

vi.mock('@audius/common/store', async () => {
  const actual = await vi.importActual<any>('@audius/common/store')
  return {
    ...actual,
    PurchaseableContentType: {
      ...actual.PurchaseableContentType,
      TRACK: 'track'
    },
    gatedContentActions: {
      ...actual.gatedContentActions,
      setLockedContentId: vi.fn()
    },
    gatedContentSelectors: {
      ...actual.gatedContentSelectors,
      getGatedContentStatusMap: () => ({})
    },
    usePremiumContentPurchaseModal: () => ({ onOpen: vi.fn() })
  }
})

vi.mock('common/hooks/useModalState', () => ({
  useModalState: () => [false, vi.fn()]
}))

vi.mock('hooks/useTrackCoverArt', () => ({
  useTrackCoverArt: () => ({ imageUrl: undefined, hasNoArtwork: false })
}))

vi.mock('components/link', () => ({
  TextLink: ({ children, to }: { children: ReactNode; to?: string }) => (
    <a href={to}>{children}</a>
  ),
  UserLink: ({ userId }: { userId?: number }) => (
    <span>{`user-${userId ?? 'unknown'}`}</span>
  )
}))

vi.mock('components/table', () => ({
  Table: ({ columns, data }: { columns: any[]; data: any[] }) => (
    <div>
      {columns.map((column) => (
        <div key={column.id}>
          {column.Cell
            ? column.Cell({
                row: { original: data[0], index: 0 }
              })
            : null}
        </div>
      ))}
    </div>
  ),
  COLUMN_WIDTHS: {
    numeric: 72,
    date: 72,
    trackActions: 112,
    overflowMenu: 64,
    playButton: 48,
    artistName: 180,
    spacer: 24
  },
  OverflowMenuButton: () => null,
  TableFavoriteButton: () => null,
  TablePlayButton: () => null,
  TableRepostButton: () => null,
  alphaSorter: () => () => 0,
  dateSorter: () => () => 0,
  numericSorter: () => () => 0
}))

const track = {
  track_id: 1,
  uid: '1',
  name: 'Track One',
  title: 'Track One',
  permalink: '/tracks/one',
  created_at: '2024-01-01',
  date: '2024-01-01',
  dateAdded: '2024-01-01',
  dateSaved: '2024-01-01',
  dateListened: '2024-01-01',
  release_date: '2024-01-01',
  duration: 180,
  time: 180,
  plays: 100,
  play_count: 100,
  repost_count: 10,
  save_count: 5,
  comment_count: 1,
  owner_id: 1,
  is_unlisted: false,
  is_delete: false,
  _marked_deleted: false,
  is_stream_gated: false,
  has_current_user_saved: false,
  has_current_user_reposted: false,
  user: {
    user_id: 1,
    name: 'Artist One',
    handle: 'artist-one',
    is_deactivated: false
  }
}

describe('TracksTable', () => {
  it('renders stacked artist info inside trackName when enabled', () => {
    render(
      <TracksTable
        data={[track] as any}
        columns={['trackName']}
        showArtistInTrackNameColumn
      />
    )

    expect(screen.getByText('Track One')).toBeInTheDocument()
    expect(screen.getByText('user-1')).toBeInTheDocument()
  })

  it('does not render stacked artist info when disabled', () => {
    render(<TracksTable data={[track] as any} columns={['trackName']} />)

    expect(screen.getByText('Track One')).toBeInTheDocument()
    expect(screen.queryByText('user-1')).not.toBeInTheDocument()
  })
})
