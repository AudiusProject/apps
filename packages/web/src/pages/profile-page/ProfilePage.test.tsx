import { useRef } from 'react'

import { SquareSizes } from '@audius/common/models'
import { Navigate, Route, Routes } from 'react-router'
import {
  describe,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
  beforeEach
} from 'vitest'

import { mockFanClub } from 'test/mocks/fixtures/fanClubs'
import { artistUser, nonArtistUser } from 'test/mocks/fixtures/users'
import {
  mockUserByHandle,
  mockRelatedUsers,
  mockUserConnectedWallets,
  mockNfts,
  mockEvents,
  mockUserCreatedCoin
} from 'test/msw/mswMocks'
import {
  RenderOptions,
  mswServer,
  render,
  screen,
  within,
  it
} from 'test/test-utils'

import ProfilePage from './ProfilePage'

vi.mock('app/ReownAppKitModal', () => ({
  appkitModal: {
    getAccount: vi.fn().mockReturnValue(undefined),
    subscribeEvents: vi.fn().mockReturnValue(() => {})
  },
  wagmiAdapter: {}
}))

const mockScrollElement = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  getBoundingClientRect: vi.fn().mockReturnValue({ top: 0 }),
  scrollTop: 0,
  clientHeight: 1000,
  scrollHeight: 2000
}

const ProfilePageWithRef = () => {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  return (
    <div ref={scrollRef}>
      {/* @ts-expect-error - the type is incorrect here on ProfilePage */}
      <ProfilePage containerRef={scrollRef.current!} />
    </div>
  )
}

export function renderProfilePage(
  user: any,
  options?: RenderOptions & { initialRoute?: string }
) {
  const { ...renderOptions } = options ?? {}
  mswServer.use(
    mockUserByHandle(user),
    mockRelatedUsers(user),
    mockUserConnectedWallets(user),
    mockNfts(),
    mockEvents()
  )

  return render(
    <Routes>
      <Route path='/' element={<Navigate to='/test-user' replace />} />
      <Route path='/:handle' element={<ProfilePageWithRef />} />
      <Route path='/:handle/:tab' element={<ProfilePageWithRef />} />
    </Routes>,
    renderOptions
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    document.getElementById = vi.fn().mockImplementation((id) => {
      if (id === 'mainContent') {
        return mockScrollElement
      }
      return null
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })
  beforeAll(() => {
    mswServer.listen()
  })
  afterEach(() => {
    mswServer.resetHandlers()
  })
  afterAll(() => {
    mswServer.close()
  })

  it('should render the profile page for a non-artist', async () => {
    renderProfilePage(nonArtistUser)

    expect(
      await screen.findByRole('heading', {
        name: new RegExp(`^${nonArtistUser.name}\\s*$`)
      })
    ).toBeInTheDocument()

    const profilePhoto = await screen.findByRole('img', {
      name: /user profile picture/i
    })
    expect(profilePhoto).toBeInTheDocument()

    expect(profilePhoto).toHaveAttribute(
      'src',
      nonArtistUser.profile_picture[SquareSizes.SIZE_480_BY_480]
    )

    const statBanner = await screen.findByTestId('stat-banner')
    expect(statBanner).toBeInTheDocument()

    expect(within(statBanner).queryByText(/tracks/i)).not.toBeInTheDocument()

    const playlistsSection = await within(statBanner).findByText('playlists')
    expect(playlistsSection).toBeInTheDocument()
    expect(
      await within(playlistsSection.parentElement!).findByText('3')
    ).toBeInTheDocument()

    const followerSection = await within(statBanner).findByText('follower')
    expect(followerSection).toBeInTheDocument()
    expect(
      await within(followerSection.parentElement!).findByText('1')
    ).toBeInTheDocument()

    const followingSection = await within(statBanner).findByText('following')
    expect(followingSection).toBeInTheDocument()
    expect(
      await within(followingSection.parentElement!).findByText('2')
    ).toBeInTheDocument()

    const navBanner = await screen.findByTestId('nav-banner')
    expect(await within(navBanner).getByText('Playlists')).toBeInTheDocument()
    expect(await within(navBanner).getByText('Reposts')).toBeInTheDocument()

    // TODO: test bio

    // TODO: test recent comments block

    // TODO: show share button
  })

  it.skip('should handle edit and buttons for profile page owner', async () => {
    renderProfilePage(nonArtistUser)
    // TODO
  })

  it.skip('should render the profile page for an artist with tracks', async () => {
    renderProfilePage(artistUser)
    // TODO
    // TODO: test related artists
  })

  it.skip('shows deactivated state if user is deactivated', async () => {
    renderProfilePage({ ...nonArtistUser, is_deactivated: true })
    // TODO
  })

  it.skip('shows user with collectibles', async () => {
    renderProfilePage(nonArtistUser)
    // TODO
  })

  it.skip('shows user with active remix context', async () => {
    renderProfilePage(nonArtistUser)
    // TODO
  })

  it('shows fan club UI when the profile belongs to an artist with an owned coin', async () => {
    mswServer.use(mockUserCreatedCoin(artistUser.id, mockFanClub))

    renderProfilePage(
      artistUser, // Use the artistUser who owns the coin
      {
        reduxState: {
          account: {
            userId: 987
          }
        }
      }
    )

    expect(
      await screen.findByRole('heading', {
        name: new RegExp(`^${artistUser.name}\\s*$`)
      })
    ).toBeInTheDocument()

    const viewFanClubButton = await screen.findByRole('button', {
      name: 'View Fan Club'
    })
    expect(viewFanClubButton).toBeInTheDocument()
    expect(await screen.findByText('$MOCK')).toBeInTheDocument()
    expect(screen.queryByText('Tip $AUDIO')).not.toBeInTheDocument()
  })

  it('should navigate to the correct tab when using sub-routes', async () => {
    renderProfilePage(artistUser, {
      initialRoute: `/${artistUser.handle}/albums`
    })

    expect(
      await screen.findByRole('heading', {
        name: new RegExp(`^${artistUser.name}\\s*$`)
      })
    ).toBeInTheDocument()

    const navBanner = await screen.findByTestId('nav-banner')
    const albumsTab = await within(navBanner).findByText('Albums')
    expect(albumsTab).toBeInTheDocument()

    const albumsTabParent = albumsTab.closest('[role="tab"]')
    expect(albumsTabParent).toBeInTheDocument()
  })
})
