import { COIN_DETAIL_PAGE } from '@audius/common/src/utils/route'
import { createMemoryHistory } from 'history'
import { Switch, Route } from 'react-router-dom'
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
  mockArtistCoin,
  mockUserCoinHasBalance,
  mockUserCoinNoBalance
} from 'test/mocks/fixtures/artistCoins'
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
  within
} from 'test/test-utils'

import { CoinDetailPage } from './CoinDetailPage'

// Mock appkitModal & wagmiAdapter to prevent errors in useExternalWalletAddress
vi.mock('app/ReownAppKitModal', () => ({
  appkitModal: {
    getAccount: vi.fn().mockReturnValue(undefined),
    subscribeEvents: vi.fn().mockReturnValue(() => {})
  },
  wagmiAdapter: {}
}))

export function renderCoinDetailPage(
  coin: typeof mockArtistCoin = mockArtistCoin,
  options?: RenderOptions
) {
  mswServer.use(mockCoinByTicker(coin))
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

  const history = createMemoryHistory({
    initialEntries: [`/coins/${coin.ticker}`]
  })

  return render(
    <Switch>
      <Route
        path={COIN_DETAIL_PAGE}
        // @ts-expect-error
        render={(props) => <CoinDetailPage {...props} />}
      />
    </Switch>,
    {
      ...options,
      customHistory: history
    }
  )
}

const assertCoinInsightsSection = async () => {
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
}

const assertCoinLeaderboardSection = () => {
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
    name: mockArtistCoin.name
  })
  expect(headings.length).toBeGreaterThan(0)
  expect(headings[0]).toBeInTheDocument()
}

const assertCoinBalanceSection = async ({
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
          /buy \$MOCK to gain access to exclusive members-only perks!/i,
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
          /buy \$MOCK to gain access to exclusive members-only perks!/i,
          {
            exact: false
          }
        )
      ).not.toBeInTheDocument()
    }
  } else {
    // Check for action buttons
    expect(
      screen.getByRole('button', { name: /buy\/sell/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /receive/i })).toBeInTheDocument()

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

const assertCreatedBySection = async () => {
  // Check for "Created By" label
  const createdByLabel = await screen.findByText(/created by/i)
  expect(createdByLabel).toBeInTheDocument()

  // Check for artist link with correct handle
  const artistLink = screen.getByRole('link', {
    name: new RegExp(artistUser.name, 'i')
  })
  expect(artistLink).toBeInTheDocument()
  expect(artistLink).toHaveAttribute('href', `/${artistUser.handle}`)

  // Check for artist name
  expect(screen.getByText(artistUser.name)).toBeInTheDocument()

  // Check for artist avatar/profile picture within the user token badge
  const userTokenBadge = screen.getByTestId('user-token-badge')
  expect(userTokenBadge).toBeInTheDocument()

  const profileImage = within(userTokenBadge).getByRole('img')
  expect(profileImage).toBeInTheDocument()

  // Verify the profile image has a src attribute (actual URL from artistUser fixture)
  const profileSrc = profileImage.getAttribute('src')
  expect(profileSrc).toBeTruthy()

  // Check for artist cover photo banner section
  // The cover photo is applied as a background via CSS-in-JS using the artist's cover_photo
  // The actual background rendering is handled by the BannerSection component
  const coverPhoto = screen.getByTestId('coin-cover-photo')
  expect(coverPhoto).toBeInTheDocument()
}

const assertCoinInfoSection = async ({
  isArtist,
  unclaimedFees
}: { isArtist?: boolean; unclaimedFees?: string } = {}) => {
  // Get the coin info section to scope all assertions within it
  const coinInfoSection = screen.getByTestId('coin-info-section')
  expect(coinInfoSection).toBeInTheDocument()

  // Check for "Created By" section
  await assertCreatedBySection()

  // Check for coin description
  if (mockArtistCoin.description) {
    expect(
      within(coinInfoSection).getByText(mockArtistCoin.description)
    ).toBeInTheDocument()
  }

  // Check for social links (link_2, link_3, link_4)
  const allLinks = within(coinInfoSection).getAllByRole('link', {
    hidden: true
  })

  if (mockArtistCoin.link_2) {
    const link2 = allLinks.find(
      (link) => link.getAttribute('href') === mockArtistCoin.link_2
    )
    expect(link2).toBeDefined()
    expect(link2).toHaveAttribute('href', mockArtistCoin.link_2)
  }

  if (mockArtistCoin.link_3) {
    const twitterLink = allLinks.find(
      (link) => link.getAttribute('href') === mockArtistCoin.link_3
    )
    expect(twitterLink).toBeDefined()
    expect(twitterLink).toHaveAttribute('href', mockArtistCoin.link_3)
  }

  if (mockArtistCoin.link_4) {
    const instagramLink = allLinks.find(
      (link) => link.getAttribute('href') === mockArtistCoin.link_4
    )
    expect(instagramLink).toBeDefined()
    expect(instagramLink).toHaveAttribute('href', mockArtistCoin.link_4)
  }

  // Check for website "Learn More" button
  if (mockArtistCoin.website) {
    const learnMoreButton = within(coinInfoSection).getByRole('button', {
      name: /learn more/i
    })
    expect(learnMoreButton).toBeInTheDocument()
  }

  // Check for Copy Coin Address button
  expect(
    within(coinInfoSection).getByRole('button', { name: /copy coin address/i })
  ).toBeInTheDocument()

  // Check for Artist Earnings section
  const artistEarningsRow =
    within(coinInfoSection).getByTestId('artist-earnings')
  expect(artistEarningsRow).toBeInTheDocument()
  expect(
    within(artistEarningsRow).getByText(/artist earnings/i)
  ).toBeInTheDocument()
  // Artist fees total_fees: 903028316 (in smallest units) = 9.03 $AUDIO
  expect(within(artistEarningsRow).getByText(/9\.03/)).toBeInTheDocument()
  expect(within(artistEarningsRow).getByText(/\$AUDIO/)).toBeInTheDocument()

  if (isArtist) {
    // Check for Unclaimed Fees section (only visible to artist/coin creator)
    const unclaimedFeesRow =
      within(coinInfoSection).getByTestId('unclaimed-fees')
    expect(unclaimedFeesRow).toBeInTheDocument()
    expect(
      within(unclaimedFeesRow).getByText(/unclaimed earnings/i)
    ).toBeInTheDocument()

    // Check for Claim link within the unclaimed fees row
    const claimButton = within(unclaimedFeesRow).getByRole('button', {
      name: /claim/i
    })
    expect(claimButton).toBeInTheDocument()

    // Verify the unclaimed amount appears in the unclaimed fees row
    expect(
      within(unclaimedFeesRow).getByText(new RegExp(unclaimedFees ?? ''))
    ).toBeInTheDocument()
    expect(within(unclaimedFeesRow).getByText(/\$AUDIO/)).toBeInTheDocument()
  }
}

describe('CoinDetailPage', () => {
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
        mockArtistCoin.mint,
        mockUserCoinNoBalance
      )
    )
    renderCoinDetailPage(mockArtistCoin)

    await assertHeader()

    await assertCoinBalanceSection({
      isAuthed: true,
      isArtist: false,
      hasBalance: false
    })
    await assertCoinInsightsSection()
    await assertCoinInfoSection({ unclaimedFees: '7.03' })
    assertCoinLeaderboardSection()
  })

  it('Authed User - IS coin holder - NOT coin creator', async () => {
    mswServer.use(mockCurrentAccount(nonArtistUser))
    mswServer.use(
      mockUserCoinsByMint(
        nonArtistUser.id,
        mockArtistCoin.mint,
        mockUserCoinHasBalance
      )
    )
    renderCoinDetailPage(mockArtistCoin)

    await assertHeader()

    await assertCoinInsightsSection()
    await assertCoinBalanceSection({
      isAuthed: true,
      isArtist: false,
      hasBalance: true
    })
    await assertCoinInfoSection()
    assertCoinLeaderboardSection()
  })

  it('Unauthed User', async () => {
    renderCoinDetailPage(mockArtistCoin)

    await assertHeader()

    await assertCoinBalanceSection({
      isAuthed: false,
      isArtist: false,
      hasBalance: false
    })

    await assertCoinInsightsSection()
    await assertCoinInfoSection()
    assertCoinLeaderboardSection()
  })

  it('Coin Creator - NOT coin holder', async () => {
    mswServer.use(mockCurrentAccount(artistUser))
    mswServer.use(
      mockUserCoinsByMint(
        artistUser.id,
        mockArtistCoin.mint,
        mockUserCoinNoBalance
      )
    )
    renderCoinDetailPage(mockArtistCoin)
    await assertHeader()

    await assertCoinBalanceSection({
      isAuthed: true,
      isArtist: true,
      hasBalance: false
    })

    await assertCoinInsightsSection()
    assertCoinLeaderboardSection()
    await assertCoinInfoSection({ isArtist: true, unclaimedFees: '7.03' })
  })

  it('Coin Creator - IS coin holder - has unclaimed fees from DBC', async () => {
    mswServer.use(mockCurrentAccount(artistUser))
    mswServer.use(
      mockUserCoinsByMint(
        artistUser.id,
        mockArtistCoin.mint,
        mockUserCoinHasBalance
      )
    )
    renderCoinDetailPage(mockArtistCoin)

    await assertHeader()

    await assertCoinBalanceSection({
      isAuthed: true,
      isArtist: true,
      hasBalance: true
    })

    await assertCoinInsightsSection()
    assertCoinLeaderboardSection()
    await assertCoinInfoSection({ isArtist: true, unclaimedFees: '7.03' })
  })
  it('Coin Creator - has unclaimed fees from both DBC & DAMM v2', async () => {
    const mockCoinWithDammV2Fees = {
      ...mockArtistCoin,
      artist_fees: {
        ...mockArtistCoin.artist_fees,
        unclaimed_damm_v2_fees: 1000000000,
        total_damm_v2_fees: 1000000000
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
    renderCoinDetailPage(mockCoinWithDammV2Fees)

    await assertHeader()
    await assertCoinInfoSection({ unclaimedFees: '17.03' })
  })
  it('Coin Creator - has unclaimed fees from just DAMM v2', async () => {
    const mockCoinWithDammV2Fees = {
      ...mockArtistCoin,
      artist_fees: {
        ...mockArtistCoin.artist_fees,
        unclaimed_dbc_fees: 0,
        total_dbc_fees: 0,
        unclaimed_damm_v2_fees: 110300000,
        total_damm_v2_fees: 1103000000
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
    renderCoinDetailPage(mockCoinWithDammV2Fees)

    await assertHeader()
    await assertCoinInfoSection({ unclaimedFees: '11.03' })
  })
})
