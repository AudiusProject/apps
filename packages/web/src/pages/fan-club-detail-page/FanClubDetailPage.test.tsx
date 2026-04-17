import { COIN_DETAIL_PAGE, coinPage } from '@audius/common/src/utils/route'
import { shortenSPLAddress } from '@audius/common/utils'
import { MemoryRouter, Route, Routes } from 'react-router'
import {
  describe,
  expect,
  beforeAll,
  afterEach,
  afterAll,
  vi,
  beforeEach
} from 'vitest'

import {
  mockFanClub,
  mockUserCoinHasBalance,
  mockUserCoinNoBalance
} from 'test/mocks/fixtures/fanClubs'
import {
  artistUser,
  generateRandomTestUsers,
  nonArtistUser
} from 'test/mocks/fixtures/users'
import {
  mockCoinByTicker,
  mockCoinMembersCount,
  mockCoinMembersList,
  mockCurrentAccount,
  mockUserCoinsByMint,
  mockUsers
} from 'test/msw/mswMocks'
import {
  RenderOptions,
  mswServer,
  render,
  screen,
  within,
  it,
  saveDomToFile
} from 'test/test-utils'

import { FanClubDetailPage } from './FanClubDetailPage'

// Mock appkitModal & wagmiAdapter to prevent errors in useExternalWalletAddress
vi.mock('app/ReownAppKitModal', () => ({
  appkitModal: {
    getAccount: vi.fn().mockReturnValue(undefined),
    subscribeEvents: vi.fn().mockReturnValue(() => {})
  },
  wagmiAdapter: {}
}))

export function renderFanClubDetailPage(
  coin: typeof mockFanClub = mockFanClub,
  options?: RenderOptions
) {
  const randomUsers = generateRandomTestUsers(10)
  mswServer.use(
    mockCoinMembersList(
      coin.mint,
      randomUsers.map((user) => ({
        user_id: user.id,
        balance: Math.floor(Math.random() * 1000000)
      }))
    )
  )
  mswServer.use(mockCoinMembersCount(coin.mint, randomUsers.length))
  mswServer.use(mockUsers([nonArtistUser, artistUser, ...randomUsers]))
  mswServer.use(mockCoinByTicker(coin))

  const initialPath = coinPage(coin.ticker)

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={COIN_DETAIL_PAGE} element={<FanClubDetailPage />} />
      </Routes>
    </MemoryRouter>,
    { ...options, skipRouter: true }
  )
}

const assertFanClubInsightsSection = async () => {
  await screen.findByRole('heading', { name: /insights/i })

  // Price: $0.0₅905 (formatted with subscript notation)
  const priceRow = screen.getByTestId('metric-row-Price')
  expect(priceRow).toBeInTheDocument()
  expect(within(priceRow).getByText('$0.0₅905')).toBeInTheDocument()
  expect(within(priceRow).getByText(/^price$/i)).toBeInTheDocument()

  // Market Cap: ~$9.0K
  const marketCapRow = screen.getByTestId('metric-row-Market Cap')
  expect(marketCapRow).toBeInTheDocument()
  expect(within(marketCapRow).getByText(/\$9\.0K/i)).toBeInTheDocument()
  expect(within(marketCapRow).getByText(/^market cap$/i)).toBeInTheDocument()

  // Volume (All-Time): $127.32
  const volumeRow = screen.getByTestId('metric-row-Volume (All-Time)')
  expect(volumeRow).toBeInTheDocument()
  expect(within(volumeRow).getByText(/\$127\.32/)).toBeInTheDocument()
  expect(
    within(volumeRow).getByText(/^volume \(all-time\)$/i)
  ).toBeInTheDocument()

  // Unique Holders: 11
  const holdersRow = screen.getByTestId('metric-row-Unique Holders')
  expect(holdersRow).toBeInTheDocument()
  expect(within(holdersRow).getByText('11')).toBeInTheDocument()
  expect(within(holdersRow).getByText(/^unique holders$/i)).toBeInTheDocument()

  // Graduation Progress: 1% (curveProgress: 0.012981... = ~1.3%)
  const graduationRow = screen.getByTestId('metric-row-Graduation Progress')
  expect(graduationRow).toBeInTheDocument()
  expect(within(graduationRow).getByText(/1%/)).toBeInTheDocument()
  expect(
    within(graduationRow).getByText(/graduation progress/i)
  ).toBeInTheDocument()

  // Check graduation progress bar is in the same row
  const progressBar = within(graduationRow).getByRole('progressbar')
  expect(progressBar).toBeInTheDocument()
  expect(progressBar).toHaveAttribute('aria-valuenow', '1')

  const copyAddressRow = screen.getByTestId('fan-club-copy-coin-address-row')
  expect(copyAddressRow).toBeInTheDocument()
  expect(
    within(copyAddressRow).getByRole('button', { name: /copy coin address/i })
  ).toBeInTheDocument()
  expect(
    within(copyAddressRow).getByText(shortenSPLAddress(mockFanClub.mint))
  ).toBeInTheDocument()
}

const assertFanClubLeaderboardSection = () => {
  // Check for Members Leaderboard heading
  const leaderboardHeading = screen.getByRole('heading', {
    name: /members leaderboard/i
  })
  expect(leaderboardHeading).toBeInTheDocument()

  // Check for members count in parentheses (10 random users generated)
  const membersCountText = screen.getByText(/\(10\)/)
  expect(membersCountText).toBeInTheDocument()

  // Check for the button to open leaderboard modal
  const openLeaderboardButton = screen.getByRole('button', {
    name: /open the leaderboard modal/i
  })
  expect(openLeaderboardButton).toBeInTheDocument()

  // The leaderboard section should be within a container
  const leaderboardSection = leaderboardHeading.closest('div')?.parentElement
  expect(leaderboardSection).toBeInTheDocument()

  // Check that the button is in the same container (either disabled during loading or enabled)
  const leaderboardContainer =
    openLeaderboardButton.closest('div[role="button"]')
  expect(leaderboardContainer).toBeInTheDocument()
}

const assertHeader = async () => {
  // Wait for the page to load by finding the Insights heading (unique to this page)
  await screen.findByRole('heading', { name: /insights/i })

  // Check that the coin name is rendered in the header (h1)
  const headings = screen.getAllByRole('heading', {
    name: mockFanClub.name
  })
  expect(headings.length).toBeGreaterThan(0)
  expect(headings[0]).toBeInTheDocument()
}

const assertFanClubBalanceSection = async ({
  isAuthed = true,
  isArtist = false,
  hasBalance = false
}: {
  isAuthed: boolean
  isArtist: boolean
  hasBalance: boolean
}) => {
  const assertBalanceBreakdownRow = (
    address: string,
    balance: string,
    isBuiltIn: boolean = false
  ) => {
    // Check for Linked Wallet with truncated address and balance in the same row
    // Find the wallet address element (in parentheses)
    const walletAddress = screen.getByText(
      isBuiltIn
        ? address
        : new RegExp(`${address.slice(0, 4)}...${address.slice(-5)}`)
    )
    expect(walletAddress).toBeInTheDocument()

    // Get the parent row container - need to go up 2 levels to get the row that contains both address and balance
    const walletInfoDiv = walletAddress.parentElement
    const walletRow = walletInfoDiv?.parentElement
    expect(walletRow).toBeInTheDocument()

    // Verify the balance (28,062) appears in the same row
    expect(walletRow).toHaveTextContent(balance)
  }
  if (!hasBalance) {
    expect(
      await screen.findByRole('button', { name: /buy/i })
    ).toBeInTheDocument()
    if (isAuthed) {
      expect(
        screen.getByRole('button', { name: /receive/i })
      ).toBeInTheDocument()
    }
    if (!isArtist) {
      expect(
        screen.getByText(/become a member/i, { exact: false })
      ).toBeInTheDocument()
      expect(
        screen.getByText(
          /buy \$MOCK to join the fan club and unlock members-only perks\./i,
          {
            exact: false
          }
        )
      ).toBeInTheDocument()
    } else {
      expect(
        screen.queryByText(/become a member/i, { exact: false })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(
          /buy \$MOCK to join the fan club and unlock members-only perks\./i,
          {
            exact: false
          }
        )
      ).not.toBeInTheDocument()
    }
  } else {
    // Scope to balance card: fan feed composer also exposes a "Send" control (post).
    const balanceSection = await screen.findByTestId('fan-club-balance-section')
    expect(
      within(balanceSection).getByRole('button', { name: /buy\/sell/i })
    ).toBeInTheDocument()
    expect(
      within(balanceSection).getByRole('button', { name: /send/i })
    ).toBeInTheDocument()
    expect(
      within(balanceSection).getByRole('button', { name: /receive/i })
    ).toBeInTheDocument()

    // Check for overall balance number (without dollar sign)
    expect(screen.getByText(/89,493,965\.32/)).toBeInTheDocument()

    // Check for USD balance value
    expect(screen.getByText(/\$809\.57/)).toBeInTheDocument()

    // Check for individual balance breakdown
    expect(screen.getByText(/balance breakdown/i)).toBeInTheDocument()
    assertBalanceBreakdownRow('TESTACCOUNTWALLETADDRESS', '28,062')
    assertBalanceBreakdownRow('Built-In Wallet', '34,063', true)
    assertBalanceBreakdownRow('TESTACCOUNTWALLETADDRESS2', '89,431,839')
  }
}

const assertFanClubHeroSection = async () => {
  // Discovery-style hero: "Fan Club" label + profile link + cover strip
  const fanClubLabel = await screen.findByText(/^fan club$/i)
  expect(fanClubLabel).toBeInTheDocument()

  const artistLink = screen.getByRole('link', {
    name: new RegExp(artistUser.name, 'i')
  })
  expect(artistLink).toBeInTheDocument()
  expect(artistLink).toHaveAttribute('href', `/${artistUser.handle}`)

  expect(screen.getByText(artistUser.name)).toBeInTheDocument()

  const coverPhoto = screen.getByTestId('fan-club-cover-photo')
  expect(coverPhoto).toBeInTheDocument()
}

const assertFanClubInfoSection = async ({
  isArtist,
  unclaimedFees,
  expectedArtistEarnings = '9.03'
}: {
  isArtist?: boolean
  unclaimedFees?: string
  expectedArtistEarnings?: string
} = {}) => {
  const hero = await screen.findByTestId('fan-club-info-hero')
  expect(hero).toBeInTheDocument()

  await assertFanClubHeroSection()

  // Check for coin description
  if (mockFanClub.description) {
    expect(within(hero).getByText(mockFanClub.description)).toBeInTheDocument()
  }

  // Check for social links (link_2, link_3, link_4)
  const allLinks = within(hero).getAllByRole('link', {
    hidden: true
  })

  if (mockFanClub.link_2) {
    const link2 = allLinks.find(
      (link) => link.getAttribute('href') === mockFanClub.link_2
    )
    expect(link2).toBeDefined()
    expect(link2).toHaveAttribute('href', mockFanClub.link_2)
  }

  if (mockFanClub.link_3) {
    const twitterLink = allLinks.find(
      (link) => link.getAttribute('href') === mockFanClub.link_3
    )
    expect(twitterLink).toBeDefined()
    expect(twitterLink).toHaveAttribute('href', mockFanClub.link_3)
  }

  if (mockFanClub.link_4) {
    const instagramLink = allLinks.find(
      (link) => link.getAttribute('href') === mockFanClub.link_4
    )
    expect(instagramLink).toBeDefined()
    expect(instagramLink).toHaveAttribute('href', mockFanClub.link_4)
  }

  // Check for website "Learn More" button
  if (mockFanClub.website) {
    const learnMoreButton = within(hero).getByRole('button', {
      name: /learn more/i
    })
    expect(learnMoreButton).toBeInTheDocument()
  }

  const onchain = screen.queryByTestId('fan-club-onchain-details')
  const showOnchainDetails = Boolean(isArtist)

  if (showOnchainDetails) {
    expect(onchain).toBeInTheDocument()
    expect(
      within(onchain!).queryByRole('button', { name: /copy coin address/i })
    ).not.toBeInTheDocument()

    if (isArtist) {
      expect(
        within(hero).getByRole('button', { name: /upload exclusive track/i })
      ).toBeInTheDocument()
    } else {
      expect(
        within(hero).queryByRole('button', {
          name: /upload exclusive track/i
        })
      ).not.toBeInTheDocument()
    }

    const artistEarningsRow = within(onchain!).getByTestId('artist-earnings')
    expect(artistEarningsRow).toBeInTheDocument()
    expect(
      within(artistEarningsRow).getByText(/artist earnings/i)
    ).toBeInTheDocument()
    expect(
      within(artistEarningsRow).getByText(
        new RegExp(expectedArtistEarnings.replace(/\./g, '\\.'))
      )
    ).toBeInTheDocument()
    expect(within(artistEarningsRow).getByText(/\$AUDIO/)).toBeInTheDocument()

    const unclaimedAmount = unclaimedFees
    if (unclaimedAmount !== undefined) {
      const unclaimedFeesRow = within(onchain!).getByTestId('unclaimed-fees')
      expect(unclaimedFeesRow).toBeInTheDocument()
      expect(
        within(unclaimedFeesRow).getByText(/unclaimed earnings/i)
      ).toBeInTheDocument()

      const claimButton = within(unclaimedFeesRow).getByRole('button', {
        name: /claim/i
      })
      expect(claimButton).toBeInTheDocument()

      expect(
        within(unclaimedFeesRow).getByText(
          new RegExp(unclaimedAmount.replace(/\./g, '\\.'))
        )
      ).toBeInTheDocument()
      expect(within(unclaimedFeesRow).getByText(/\$AUDIO/)).toBeInTheDocument()
    }
  } else {
    expect(onchain).not.toBeInTheDocument()
  }
}

describe('FanClubDetailPage', () => {
  beforeEach(() => {
    // Mock any DOM methods if needed
    vi.clearAllMocks()
  })

  afterEach(() => {
    mswServer.resetHandlers()
    vi.clearAllMocks()
  })

  beforeAll(() => {
    mswServer.listen()
  })

  afterAll(() => {
    mswServer.close()
  })

  it('Authed User - NOT coin holder - NOT coin creator', async () => {
    mswServer.use(mockCurrentAccount(nonArtistUser))
    mswServer.use(
      mockUserCoinsByMint(
        nonArtistUser.id,
        mockFanClub.mint,
        mockUserCoinNoBalance
      )
    )
    renderFanClubDetailPage(mockFanClub)

    await assertHeader()

    await assertFanClubBalanceSection({
      isAuthed: true,
      isArtist: false,
      hasBalance: false
    })
    await assertFanClubInsightsSection()
    await assertFanClubInfoSection()
    assertFanClubLeaderboardSection()
  })

  it('Authed User - IS coin holder - NOT coin creator', async () => {
    mswServer.use(mockCurrentAccount(nonArtistUser))
    mswServer.use(
      mockUserCoinsByMint(
        nonArtistUser.id,
        mockFanClub.mint,
        mockUserCoinHasBalance
      )
    )
    renderFanClubDetailPage(mockFanClub)

    await assertHeader()

    await assertFanClubInsightsSection()
    await assertFanClubBalanceSection({
      isAuthed: true,
      isArtist: false,
      hasBalance: true
    })
    await assertFanClubInfoSection()
    assertFanClubLeaderboardSection()
  })

  it('Unauthed User', async () => {
    renderFanClubDetailPage(mockFanClub)

    await assertHeader()

    await assertFanClubBalanceSection({
      isAuthed: false,
      isArtist: false,
      hasBalance: false
    })

    await assertFanClubInsightsSection()
    await assertFanClubInfoSection()
    assertFanClubLeaderboardSection()
  })

  it('Coin Creator - NOT coin holder', async () => {
    mswServer.use(mockCurrentAccount(artistUser))
    mswServer.use(
      mockUserCoinsByMint(
        artistUser.id,
        mockFanClub.mint,
        mockUserCoinNoBalance
      )
    )
    renderFanClubDetailPage(mockFanClub)
    await assertHeader()

    await assertFanClubBalanceSection({
      isAuthed: true,
      isArtist: true,
      hasBalance: false
    })

    await assertFanClubInsightsSection()
    assertFanClubLeaderboardSection()
    await assertFanClubInfoSection({ isArtist: true, unclaimedFees: '7.03' })
  })

  it('Coin Creator - IS coin holder - has unclaimed fees from DBC', async () => {
    mswServer.use(mockCurrentAccount(artistUser))
    mswServer.use(
      mockUserCoinsByMint(
        artistUser.id,
        mockFanClub.mint,
        mockUserCoinHasBalance
      )
    )
    renderFanClubDetailPage(mockFanClub)

    await assertHeader()

    await assertFanClubBalanceSection({
      isAuthed: true,
      isArtist: true,
      hasBalance: true
    })

    await assertFanClubInsightsSection()
    assertFanClubLeaderboardSection()
    await assertFanClubInfoSection({ isArtist: true, unclaimedFees: '7.03' })
    saveDomToFile('FanClubDetailPage-has-unclaimed-fees-from-dbc.html')
  })
  it('Coin Creator - has unclaimed fees from both DBC & DAMM v2', async () => {
    const mockCoinWithDammV2Fees = {
      ...mockFanClub,
      artist_fees: {
        ...mockFanClub.artist_fees,
        unclaimed_damm_v2_fees: 1000000000,
        total_damm_v2_fees: 1000000000,
        unclaimed_fees: 703028314 + 1000000000,
        total_fees: 903028316 + 1000000000
      }
    }
    mswServer.use(mockCurrentAccount(artistUser))
    mswServer.use(
      mockUserCoinsByMint(
        artistUser.id,
        mockCoinWithDammV2Fees.mint,
        mockUserCoinHasBalance
      )
    )
    renderFanClubDetailPage(mockCoinWithDammV2Fees)

    await assertHeader()
    await assertFanClubInfoSection({
      isArtist: true,
      unclaimedFees: '17.03'
    })
  })
  it('Coin Creator - has unclaimed fees from just DAMM v2', async () => {
    const mockCoinWithDammV2Fees = {
      ...mockFanClub,
      artist_fees: {
        ...mockFanClub.artist_fees,
        unclaimed_dbc_fees: 0,
        total_dbc_fees: 0,
        unclaimed_damm_v2_fees: 110300000,
        total_damm_v2_fees: 1103000000,
        unclaimed_fees: 1103000000,
        total_fees: 1103000000
      }
    }
    mswServer.use(mockCurrentAccount(artistUser))
    mswServer.use(
      mockUserCoinsByMint(
        artistUser.id,
        mockCoinWithDammV2Fees.mint,
        mockUserCoinHasBalance
      )
    )
    renderFanClubDetailPage(mockCoinWithDammV2Fees)

    await assertHeader()
    await assertFanClubInfoSection({
      isArtist: true,
      unclaimedFees: '11.03',
      expectedArtistEarnings: '11.03'
    })
  })
})
