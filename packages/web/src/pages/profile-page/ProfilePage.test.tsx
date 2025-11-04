import { useRef } from 'react'

import { SquareSizes, WidthSizes } from '@audius/common/models'
import { developmentConfig } from '@audius/sdk'
import { http, HttpResponse } from 'msw'
import { Navigate, Route, Routes } from 'react-router-dom-v5-compat'
import {
  describe,
  expect,
  it,
  beforeAll,
  afterEach,
  afterAll,
  vi,
  beforeEach
} from 'vitest'

import {
  RenderOptions,
  mswServer,
  render,
  screen,
  within
} from 'test/test-utils'

import ProfilePage from './ProfilePage'

// Mock useIsMobile to return false for desktop layout
vi.mock('hooks/useIsMobile', () => ({
  useIsMobile: () => false
}))

// Enable feature flags (e.g., ARTIST_COINS) for this test file
vi.mock('@audius/common/hooks', async () => {
  const actual = await vi.importActual<typeof import('@audius/common/hooks')>(
    '@audius/common/hooks'
  )
  return {
    ...actual,
    useFeatureFlag: () => ({ isLoaded: true, isEnabled: true })
  }
})

// Mock appkitModal
vi.mock('app/ReownAppKitModal', async () => {
  const actual = await vi.importActual<typeof import('app/ReownAppKitModal')>(
    'app/ReownAppKitModal'
  )
  return {
    ...actual,
    appkitModal: {
      getAccount: vi.fn(() => ({ address: '0xMockWalletAddress' }))
    }
  }
})

const { apiEndpoint } = developmentConfig.network

// TODO: move these into a fixtures folder setup
const nonArtistUser = {
  id: '7eP5n',
  handle: 'test-user',
  name: 'Test User',
  profile_picture: {
    [SquareSizes.SIZE_150_BY_150]: `${apiEndpoint}/image-profile-small.jpg`,
    [SquareSizes.SIZE_480_BY_480]: `${apiEndpoint}/image-profile-medium.jpg`,
    mirrors: [apiEndpoint]
  },
  follower_count: 1,
  followee_count: 2,
  track_count: 0,
  playlist_count: 3,
  repost_count: 4,
  album_count: 0,
  bio: 'Test bio',
  cover_photo: {
    [WidthSizes.SIZE_2000]: `${apiEndpoint}/image-cover.jpg`,
    mirrors: [apiEndpoint]
  },
  is_verified: false,
  is_deactivated: false,
  is_available: true,
  erc_wallet: '0x123',
  spl_wallet: '0x456',
  wallet: '0x123',
  balance: '0',
  associated_wallets_balance: '0',
  total_balance: '0',
  waudio_balance: '0',
  associated_sol_wallets_balance: '0',
  blocknumber: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_storage_v2: true,
  handle_lc: 'test-user'
}

const artistUser = {
  id: '7eP5n',
  handle: 'test-user',
  name: 'Test User',
  profile_picture: {
    [SquareSizes.SIZE_150_BY_150]: `${apiEndpoint}/image-profile-small.jpg`,
    [SquareSizes.SIZE_480_BY_480]: `${apiEndpoint}/image-profile-medium.jpg`,
    mirrors: [apiEndpoint]
  },
  follower_count: 1,
  followee_count: 2,
  track_count: 0,
  playlist_count: 3,
  repost_count: 4,
  album_count: 0,
  bio: 'Test bio',
  cover_photo: {
    [WidthSizes.SIZE_2000]: `${apiEndpoint}/image-cover.jpg`,
    mirrors: [apiEndpoint]
  },
  is_verified: false,
  is_deactivated: false,
  is_available: true,
  erc_wallet: '0x123',
  spl_wallet: '0x456',
  wallet: '0x123',
  balance: '0',
  associated_wallets_balance: '0',
  total_balance: '0',
  waudio_balance: '0',
  associated_sol_wallets_balance: '0',
  blocknumber: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_storage_v2: true,
  handle_lc: 'test-user'
}

const mockData = {
  connected_wallets: { data: { erc_wallets: [], spl_wallets: [] } },
  userByHandle: { data: [artistUser] },
  supporting: { data: [] },
  supporters: { data: [] },
  related: { data: [] },
  events: { data: [] },
  userCoins: {
    data: [
      {
        name: 'Test Coin',
        ticker: 'TEST',
        mint: 'test-mint-123',
        decimals: 9,
        owner_id: artistUser.id,
        logo_uri: 'https://example.com/logo.png',
        has_discord: false,
        created_at: '2024-01-01T00:00:00.000Z',
        marketCap: 1000000,
        fdv: 1000000,
        liquidity: 50000,
        lastTradeUnixTime: Date.now() / 1000,
        lastTradeHumanTime: new Date().toISOString(),
        price: 1.0,
        history24hPrice: 1.0,
        priceChange24hPercent: 0,
        uniqueWallet24h: 10,
        uniqueWalletHistory24h: 10,
        uniqueWallet24hChangePercent: 0,
        totalSupply: 1000000000,
        circulatingSupply: 1000000000,
        holder: 100,
        trade24h: 50,
        tradeHistory24h: 50,
        sell24h: 25,
        buy24h: 25,
        v24h: 50000,
        v24hUSD: 50000,
        buyHistory24h: 25,
        sellHistory24h: 25,
        vHistory24h: 50000,
        vHistory24hUSD: 50000,
        trade24hChangePercent: 0,
        sell24hChangePercent: 0,
        buy24hChangePercent: 0,
        v24hChangePercent: 0,
        vBuy24h: 25000,
        vBuy24hUSD: 25000,
        vBuyHistory24h: 25000,
        vBuyHistory24hUSD: 25000,
        vSell24h: 25000,
        vSell24hUSD: 25000,
        vSellHistory24h: 25000,
        vSellHistory24hUSD: 25000,
        volumeBuyUSD: 25000,
        volumeSellUSD: 25000,
        totalTrade: 1000,
        buy: 500,
        sell: 500,
        dynamicBondingCurve: {
          isMigrated: false,
          priceUSD: 1.0,
          address: 'test-mint-123'
        }
      }
    ]
  },
  artistCoin: {
    data: {
      name: 'Test Coin',
      ticker: 'TEST',
      mint: 'test-mint-123',
      decimals: 9,
      owner_id: artistUser.id,
      logo_uri: 'https://example.com/logo.png',
      has_discord: false,
      created_at: '2024-01-01T00:00:00.000Z',
      marketCap: 1000000,
      fdv: 1000000,
      liquidity: 50000,
      lastTradeUnixTime: Date.now() / 1000,
      lastTradeHumanTime: new Date().toISOString(),
      price: 1.0,
      history24hPrice: 1.0,
      priceChange24hPercent: 0,
      uniqueWallet24h: 10,
      uniqueWalletHistory24h: 10,
      uniqueWallet24hChangePercent: 0,
      totalSupply: 1000000000,
      circulatingSupply: 1000000000,
      holder: 100,
      trade24h: 50,
      tradeHistory24h: 50,
      sell24h: 25,
      buy24h: 25,
      v24h: 50000,
      v24hUSD: 50000,
      buyHistory24h: 25,
      sellHistory24h: 25,
      vHistory24h: 50000,
      vHistory24hUSD: 50000,
      trade24hChangePercent: 0,
      sell24hChangePercent: 0,
      buy24hChangePercent: 0,
      v24hChangePercent: 0,
      vBuy24h: 25000,
      vBuy24hUSD: 25000,
      vBuyHistory24h: 25000,
      vBuyHistory24hUSD: 25000,
      vSell24h: 25000,
      vSell24hUSD: 25000,
      vSellHistory24h: 25000,
      vSellHistory24hUSD: 25000,
      volumeBuyUSD: 25000,
      volumeSellUSD: 25000,
      totalTrade: 1000,
      buy: 500,
      sell: 500,
      dynamicBondingCurve: {
        isMigrated: false,
        priceUSD: 1.0,
        address: 'test-mint-123'
      }
    }
  }
}

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

export function renderProfilePage(overrides = {}, options?: RenderOptions) {
  const user = { ...nonArtistUser, ...overrides }

  // TODO: move these out of this render and standardize them more - also accept args to configure the various endpoints
  mswServer.use(
    http.get(`${apiEndpoint}/v1/full/users/handle/${user.handle}`, () => {
      return HttpResponse.json({ data: [user] })
    }),
    http.get(`${apiEndpoint}/v1/users/${user.id}/connected_wallets`, () => {
      return HttpResponse.json(mockData.connected_wallets)
    }),
    http.get(`${apiEndpoint}/v1/full/users/${user.id}/supporting`, () => {
      return HttpResponse.json(mockData.supporting)
    }),
    http.get(`${apiEndpoint}/v1/full/users/${user.id}/supporters`, () => {
      return HttpResponse.json(mockData.supporters)
    }),
    http.get(`${apiEndpoint}/v1/full/users/${user.id}/related`, () => {
      return HttpResponse.json(mockData.related)
    }),
    http.get(`${apiEndpoint}/v1/events/entity`, () => {
      return HttpResponse.json(mockData.events)
    }),
    // User coins API - handle ownerId query parameter
    http.get(`${apiEndpoint}/v1/coins`, ({ request }) => {
      const url = new URL(request.url)
      const ownerIdParam = url.searchParams.get('ownerId')
      const ownerIdArrayParam = url.searchParams.get('owner_id')

      // Check both ownerId and owner_id parameters
      const ownerParam = ownerIdParam || ownerIdArrayParam

      // If querying by ownerId, check if it matches the artist user
      if (ownerParam) {
        // For the artist user who owns a coin, return the coins list
        if (ownerParam.includes(artistUser.id)) {
          return HttpResponse.json(mockData.userCoins)
        }
        // For non-artist users, return empty list
        return HttpResponse.json({ data: [] })
      }

      // Default: return all coins (for pagination queries)
      return HttpResponse.json(mockData.userCoins)
    }),
    // Artist coin API
    http.get(`${apiEndpoint}/v1/coins/test-mint-123`, () => {
      return HttpResponse.json(mockData.artistCoin)
    }),
    // ETH NFTs api
    http.get(
      'https://rinkeby-api.opensea.io/api/v2/chain/ethereum/account/0x123/nfts',
      () => {
        return HttpResponse.json({ data: [] })
      }
    )
  )

  return render(
    <Routes>
      <Route path='/' element={<Navigate to='/test-user' replace />} />
      <Route path='/:handle' element={<ProfilePageWithRef />} />
    </Routes>,
    options
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
    renderProfilePage()

    // User header
    expect(
      await screen.findByRole('heading', { name: nonArtistUser.name })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: `@${nonArtistUser.handle}` })
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
      `url(${nonArtistUser.profile_picture[SquareSizes.SIZE_480_BY_480]})`
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

    // TODO: supporting block

    // TODO: supporters block

    // TODO: show share button
  })

  it.skip('should handle edit and buttons for profile page owner', async () => {
    renderProfilePage()
    // TODO
  })

  it.skip('should render the profile page for an artist with tracks', async () => {
    renderProfilePage()
    // TODO
    // TODO: test related artists
  })

  it.skip('shows deactivated state if user is deactivated', async () => {
    // TODO: set up this prop
    renderProfilePage({ isDeactivated: true })
    // TODO
  })

  it.skip('shows user with active remix context', async () => {
    renderProfilePage()
    // TODO
  })

  it('shows buy coin UI when the profile belongs to an artist with an owned coin', async () => {
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

    // Wait for the profile to load
    expect(
      await screen.findByRole('heading', { name: artistUser.name })
    ).toBeInTheDocument()

    // Verify that coin-related elements are present when user has coins
    const buyButton = await screen.findByRole('button', { name: 'Buy Coins' })
    expect(buyButton).toBeInTheDocument()
    expect(await screen.findByText('$TEST')).toBeInTheDocument()
    expect(screen.queryByText('Tip $AUDIO')).not.toBeInTheDocument()
  })
})
