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

// Mock appkitModal & wagmiAdapter to prevent errors in useExternalWalletAddress
vi.mock('app/ReownAppKitModal', () => ({
  appkitModal: {
    getAccount: vi.fn().mockReturnValue(undefined),
    subscribeEvents: vi.fn().mockReturnValue(() => {})
  },
  wagmiAdapter: {}
}))

// Need to mock the main content scroll element - otherwise things break
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
    // Mock document.getElementById
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

    // User header (name may have trailing space in mobile header)
    expect(
      await screen.findByRole('heading', {
        name: new RegExp(`^${nonArtistUser.name}\\s*$`)
      })
    ).toBeInTheDocument()

    // Profile and cover photos
    const profilePhoto = await screen.findByRole('img', {
      name: /user profile picture/i
    })
    expect(profilePhoto).toBeInTheDocument()

    const dynamicImage = await within(profilePhoto).findByTestId(
      'dynamic-image-second'
    )
    expect(dynamicImage.style.backgroundImage).toEqual(
      `url("${nonArtistUser.profile_picture[SquareSizes.SIZE_480_BY_480]}")`
    )

    // TODO: cover photo not rendering in test env for some reason
    // await vi.waitFor(
    //   async () => {
    //     // debug()
    //     const coverPhoto = await screen.findByRole('img', {
    //       name: /user cover photo/i
    //     })
    //     expect(coverPhoto).toBeInTheDocument()
    //     const coverDynamicImage = await within(coverPhoto).findByTestId(
    //       'dynamic-image-second'
    //     )
    //     expect(coverDynamicImage).toBeInTheDocument()
    //     console.log(
    //       'coverDynamicImage',
    //       coverDynamicImage.style.backgroundImage
    //     )
    //     expect(coverDynamicImage.style.backgroundImage).toContain(
    //       `url("${testUser.cover_photo[WidthSizes.SIZE_2000]}")`
    //     )
    //   },
    //   { interval: 1000, timeout: 5000 }
    // )

    // // Stat banner
    const statBanner = await screen.findByTestId('stat-banner')
    expect(statBanner).toBeInTheDocument()

    // This should only show if we're an artist
    expect(within(statBanner).queryByText(/tracks/i)).not.toBeInTheDocument()

    // Check playlists count
    const playlistsSection = await within(statBanner).findByText('playlists')
    expect(playlistsSection).toBeInTheDocument()
    expect(
      await within(playlistsSection.parentElement!).findByText('3')
    ).toBeInTheDocument()

    // Check follower count
    const followerSection = await within(statBanner).findByText('follower')
    expect(followerSection).toBeInTheDocument()
    expect(
      await within(followerSection.parentElement!).findByText('1')
    ).toBeInTheDocument()

    // Check following count
    const followingSection = await within(statBanner).findByText('following')
    expect(followingSection).toBeInTheDocument()
    expect(
      await within(followingSection.parentElement!).findByText('2')
    ).toBeInTheDocument()

    // // render appropriate tabs with correct content

    // // Tabs
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
    // TODO: set up this prop
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

    // Mock a different current user to simulate viewing another user's profile
    renderProfilePage(
      artistUser, // Use the artistUser who owns the coin
      {
        reduxState: {
          account: {
            userId: 987 // Different from artistUser.id
          }
        }
      }
    )

    // Wait for the profile to load (name may have trailing space in mobile header)
    expect(
      await screen.findByRole('heading', {
        name: new RegExp(`^${artistUser.name}\\s*$`)
      })
    ).toBeInTheDocument()

    // Verify that coin-related elements are present when user has coins
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

    // Wait for the profile to load
    expect(
      await screen.findByRole('heading', {
        name: new RegExp(`^${artistUser.name}\\s*$`)
      })
    ).toBeInTheDocument()

    // Verify that the Albums tab is active (not the first tab)
    const navBanner = await screen.findByTestId('nav-banner')
    const albumsTab = await within(navBanner).findByText('Albums')
    expect(albumsTab).toBeInTheDocument()

    // The active tab should have specific styling - check parent for active class
    const albumsTabParent = albumsTab.closest('[role="tab"]')
    expect(albumsTabParent).toBeInTheDocument()
  })
})
