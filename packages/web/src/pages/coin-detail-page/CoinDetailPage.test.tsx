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

import { mockArtistCoin } from 'test/mocks/fixtures/artistCoins'
import { mockCoinByTicker } from 'test/msw/mswMocks'
import { RenderOptions, mswServer, render, screen } from 'test/test-utils'

import { CoinDetailPage } from './CoinDetailPage'

export function renderCoinDetailPage(
  coin: typeof mockArtistCoin = mockArtistCoin,
  options?: RenderOptions
) {
  mswServer.use(mockCoinByTicker(coin))

  const history = createMemoryHistory({
    initialEntries: [`/coins/${coin.symbol}`]
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

  it('renders ticker', async () => {
    renderCoinDetailPage(mockArtistCoin)

    // Check that the ticker is rendered in the header
    expect(
      await screen.findByRole('heading', {
        name: mockArtistCoin.name,
        level: 1
      })
    ).toBeInTheDocument()

    // TODO: check more things
  })
  /**
   * TODO: write more tests
   */
})
