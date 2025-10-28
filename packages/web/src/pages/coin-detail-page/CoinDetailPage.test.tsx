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
  mockCoinHoldings
} from 'test/mocks/fixtures/artistCoins'
import { nonArtistUser } from 'test/mocks/fixtures/users'
import {
  mockCoinByTicker,
  mockCurrentAccount,
  mockUserCoinHoldings
} from 'test/msw/mswMocks'
import { RenderOptions, mswServer, render, screen } from 'test/test-utils'

import { CoinDetailPage } from './CoinDetailPage'

export function renderCoinDetailPage(
  coin: typeof mockArtistCoin = mockArtistCoin,
  options?: RenderOptions
) {
  mswServer.use(mockCoinByTicker(coin))

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

describe('CoinDetailPage', () => {
  beforeEach(() => {
    // Mock any DOM methods if needed
    vi.clearAllMocks()
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

  it('Authed User - NOT coin holder - NOT coin creator', async () => {
    mswServer.use(mockCurrentAccount(nonArtistUser))
    renderCoinDetailPage(mockArtistCoin)

    // Wait for the page to load by finding the Insights heading (unique to this page)
    await screen.findByRole('heading', { name: /insights/i })

    // Check that the coin name is rendered in the header (h1)
    const headings = screen.getAllByRole('heading', {
      name: mockArtistCoin.name
    })
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toBeInTheDocument()

    // Check for Buy button (zero balance state)
    expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /receive/i })).toBeInTheDocument()

    // Check for "Become a member" section
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

    // Check for Insights panel metrics labels
    expect(screen.getByText(/price/i)).toBeInTheDocument()
    expect(screen.getByText(/market cap/i)).toBeInTheDocument()
    expect(screen.getByText(/volume \(all-time\)/i)).toBeInTheDocument()
    expect(screen.getByText(/unique holders/i)).toBeInTheDocument()
    expect(screen.getByText(/graduation progress/i)).toBeInTheDocument()

    // Check for specific insight values from mock data
    // Price: $0.0₅905 (formatted with subscript notation)
    expect(screen.getByText('$0.0₅905')).toBeInTheDocument()

    // Market Cap: ~$9.0K (10049 formatted)
    expect(screen.getByText(/\$9\.0K/i)).toBeInTheDocument()

    // Volume (All-Time): $127.32
    expect(screen.getByText(/\$127\.32/)).toBeInTheDocument()

    // Unique Holders: 11
    expect(screen.getByText('11')).toBeInTheDocument()

    // Graduation Progress: 1% (curveProgress: 0.012981... = ~1.3%)
    expect(screen.getByText(/1%/)).toBeInTheDocument()

    // Check graduation progress bar
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '1')

    // Check for coin description (first paragraph)
    if (mockArtistCoin.description) {
      const firstParagraph = mockArtistCoin.description.split('\n')[0]
      expect(
        screen.getByText(firstParagraph, { exact: false })
      ).toBeInTheDocument()
    }

    // Check for Copy Coin Address button
    expect(
      screen.getByRole('button', { name: /copy coin address/i })
    ).toBeInTheDocument()

    // Check for Unlock Schedule - visible in CoinInfoSection
    expect(screen.getByText(/unlock schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/5 years \(post-graduation\)/i)).toBeInTheDocument()

    // Check for Artist Earnings section - both header and value
    expect(screen.getByText(/artist earnings/i)).toBeInTheDocument()
    // Artist fees total_fees: 903028316 (in smallest units) = 9.03 $AUDIO
    expect(screen.getByText(/9\.03/)).toBeInTheDocument()
    expect(screen.getByText(/\$AUDIO/)).toBeInTheDocument()

    // Check for Members Leaderboard heading
    expect(
      screen.getByRole('heading', { name: /members leaderboard/i })
    ).toBeInTheDocument()
  })

  it('Authed User - IS coin holder - NOT coin creator', async () => {
    mswServer.use(mockCurrentAccount(nonArtistUser))
    mswServer.use(
      mockUserCoinHoldings(
        nonArtistUser.id,
        mockArtistCoin.mint,
        mockCoinHoldings
      )
    )
    renderCoinDetailPage(mockArtistCoin)

    // Wait for the page to load by finding the Insights heading (unique to this page)
    await screen.findByRole('heading', { name: /insights/i })

    // Check that the coin name is rendered in the header (h1)
    const headings = screen.getAllByRole('heading', {
      name: mockArtistCoin.name
    })
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toBeInTheDocument()

    // Check for Balance display (holdings state)
    // Balance: 28,062.08 $MOCK
    expect(screen.getByText(/28,062\.08/)).toBeInTheDocument()
    expect(screen.getByText(/\$MOCK/)).toBeInTheDocument()

    // Check for USD balance value
    expect(screen.getByText(/\$0\.4181/)).toBeInTheDocument()

    // Check for Balance Breakdown heading
    expect(screen.getByText(/balance breakdown/i)).toBeInTheDocument()

    // Check for Linked Wallet with truncated address (FiFM...5cgHi)
    expect(screen.getByText(/FiFM\.{3}5cgHi/)).toBeInTheDocument()

    // Check for wallet balance in breakdown (28,062)
    expect(screen.getByText('28,062')).toBeInTheDocument()

    // Check for action buttons
    expect(
      screen.getByRole('button', { name: /buy\/sell/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /receive/i })).toBeInTheDocument()

    // Check for "Become a member" section
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

    // Check for Insights panel metrics labels
    expect(screen.getByText(/price/i)).toBeInTheDocument()
    expect(screen.getByText(/market cap/i)).toBeInTheDocument()
    expect(screen.getByText(/volume \(all-time\)/i)).toBeInTheDocument()
    expect(screen.getByText(/unique holders/i)).toBeInTheDocument()
    expect(screen.getByText(/graduation progress/i)).toBeInTheDocument()

    // Check for specific insight values from mock data
    // Price: $0.0₅905 (formatted with subscript notation)
    expect(screen.getByText('$0.0₅905')).toBeInTheDocument()

    // Market Cap: ~$9.0K (10049 formatted)
    expect(screen.getByText(/\$9\.0K/i)).toBeInTheDocument()

    // Volume (All-Time): $127.32
    expect(screen.getByText(/\$127\.32/)).toBeInTheDocument()

    // Unique Holders: 11
    expect(screen.getByText('11')).toBeInTheDocument()

    // Graduation Progress: 1% (curveProgress: 0.012981... = ~1.3%)
    expect(screen.getByText(/1%/)).toBeInTheDocument()

    // Check graduation progress bar
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '1')

    // Check for coin description (first paragraph)
    if (mockArtistCoin.description) {
      const firstParagraph = mockArtistCoin.description.split('\n')[0]
      expect(
        screen.getByText(firstParagraph, { exact: false })
      ).toBeInTheDocument()
    }

    // Check for Copy Coin Address button
    expect(
      screen.getByRole('button', { name: /copy coin address/i })
    ).toBeInTheDocument()

    // Check for Unlock Schedule - visible in CoinInfoSection
    expect(screen.getByText(/unlock schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/5 years \(post-graduation\)/i)).toBeInTheDocument()

    // Check for Artist Earnings section - both header and value
    expect(screen.getByText(/artist earnings/i)).toBeInTheDocument()
    // Artist fees total_fees: 903028316 (in smallest units) = 9.03 $AUDIO
    expect(screen.getByText(/9\.03/)).toBeInTheDocument()
    expect(screen.getByText(/\$AUDIO/)).toBeInTheDocument()

    // Check for Members Leaderboard heading
    expect(
      screen.getByRole('heading', { name: /members leaderboard/i })
    ).toBeInTheDocument()
  })

  it('Unauthed User', async () => {
    renderCoinDetailPage(mockArtistCoin)

    // Wait for the page to load by finding the Insights heading (unique to this page)
    await screen.findByRole('heading', { name: /insights/i })

    // Check that the coin name is rendered in the header (h1)
    const headings = screen.getAllByRole('heading', {
      name: mockArtistCoin.name
    })
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toBeInTheDocument()

    // Check for Buy button (zero balance state)
    expect(screen.getByRole('button', { name: /buy/i })).toBeInTheDocument()

    // This is the only real difference between the authed and unauthed user - the Receive button should NOT be visible
    expect(
      screen.queryByRole('button', { name: /receive/i })
    ).not.toBeInTheDocument()

    // Check for "Become a member" section
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

    // Check for Insights panel metrics labels
    expect(screen.getByText(/price/i)).toBeInTheDocument()
    expect(screen.getByText(/market cap/i)).toBeInTheDocument()
    expect(screen.getByText(/volume \(all-time\)/i)).toBeInTheDocument()
    expect(screen.getByText(/unique holders/i)).toBeInTheDocument()
    expect(screen.getByText(/graduation progress/i)).toBeInTheDocument()

    // Check for specific insight values from mock data
    // Price: $0.0₅905 (formatted with subscript notation)
    expect(screen.getByText('$0.0₅905')).toBeInTheDocument()

    // Market Cap: ~$9.0K (10049 formatted)
    expect(screen.getByText(/\$9\.0K/i)).toBeInTheDocument()

    // Volume (All-Time): $127.32
    expect(screen.getByText(/\$127\.32/)).toBeInTheDocument()

    // Unique Holders: 11
    expect(screen.getByText('11')).toBeInTheDocument()

    // Graduation Progress: 1% (curveProgress: 0.012981... = ~1.3%)
    expect(screen.getByText(/1%/)).toBeInTheDocument()

    // Check graduation progress bar
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '1')

    // Check for coin description (first paragraph)
    if (mockArtistCoin.description) {
      const firstParagraph = mockArtistCoin.description.split('\n')[0]
      expect(
        screen.getByText(firstParagraph, { exact: false })
      ).toBeInTheDocument()
    }

    // Check for Copy Coin Address button
    expect(
      screen.getByRole('button', { name: /copy coin address/i })
    ).toBeInTheDocument()

    // Check for Unlock Schedule - visible in CoinInfoSection
    expect(screen.getByText(/unlock schedule/i)).toBeInTheDocument()
    expect(screen.getByText(/5 years \(post-graduation\)/i)).toBeInTheDocument()

    // Check for Artist Earnings section - both header and value
    expect(screen.getByText(/artist earnings/i)).toBeInTheDocument()
    // Artist fees total_fees: 903028316 (in smallest units) = 9.03 $AUDIO
    expect(screen.getByText(/9\.03/)).toBeInTheDocument()
    expect(screen.getByText(/\$AUDIO/)).toBeInTheDocument()

    // Check for Members Leaderboard heading
    expect(
      screen.getByRole('heading', { name: /members leaderboard/i })
    ).toBeInTheDocument()
  })
})
