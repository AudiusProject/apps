import { Id } from '@audius/sdk'

export const mockArtistCoin = {
  ticker: 'MOCK',
  name: 'Mock Coin',
  mint: 'abcedfg1234567890',
  decimals: 9,
  owner_id: Id.parse(1),
  logo_uri:
    'https://s3.coinmarketcap.com/static-gravity/image/a28128d9ff7c49c9ad33ee2f626fda40.png',
  description: 'This is my mock coin',
  link_2:
    'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing',
  link_3: 'https://x.com/mock-coin',
  link_4: 'https://instagram.com/mock-coin',
  website: 'https://mock-coin.com',
  created_at: '2025-07-23T22:40:23.402315Z',
  /**
   * @note All the stuff below is sample data copied from prod data on Oct 24, 2025
   */
  has_discord: false,
  coin_updated_at: '2025-10-08T19:11:40.970706Z',
  marketCap: 10049.184218222164,
  fdv: 10049.184218222164,
  liquidity: 0,
  lastTradeUnixTime: 1761189872,
  lastTradeHumanTime: '2025-10-23T03:24:32',
  price: 0.000010049184218222164,
  history24hPrice: 0,
  priceChange24hPercent: 0,
  uniqueWallet24h: 0,
  uniqueWalletHistory24h: 1,
  uniqueWallet24hChangePercent: -100,
  totalSupply: 1000000000,
  circulatingSupply: 1000000000,
  holder: 11,
  trade24h: 0,
  tradeHistory24h: 1,
  trade24hChangePercent: -100,
  sell24h: 0,
  sellHistory24h: 0,
  sell24hChangePercent: 0,
  buy24h: 0,
  buyHistory24h: 1,
  buy24hChangePercent: -100,
  v24h: 0,
  v24hUSD: 0,
  vHistory24h: 4442.128596868,
  vHistory24hUSD: 0.03998961334139204,
  v24hChangePercent: -100,
  vBuy24h: 0,
  vBuy24hUSD: 0,
  vBuyHistory24h: 4442.128596868,
  vBuyHistory24hUSD: 0.03998961334139204,
  vBuy24hChangePercent: -100,
  vSell24h: 0,
  vSell24hUSD: 0,
  vSellHistory24h: 0,
  vSellHistory24hUSD: 0,
  vSell24hChangePercent: 0,
  numberMarkets: 1,
  totalVolume: 24178186.11482963,
  totalVolumeUSD: 127.320620094101,
  volumeBuyUSD: 126.90465171441761,
  volumeSellUSD: 0.4159683796833879,
  volumeBuy: 24137016.232141994,
  volumeSell: 41169.882687636,
  totalTrade: 14,
  buy: 13,
  sell: 1,
  dynamicBondingCurve: {
    address: 'awdouanwdlawd',
    price: 0.00022289129385721687,
    priceUSD: 0.000009046035998010495,
    curveProgress: 0.012981140573439048,
    isMigrated: false,
    creatorQuoteFee: 903028314,
    totalTradingQuoteFee: 1806056632,
    creatorWalletAddress: 'awdouanwdounwad'
  },
  artist_fees: {
    unclaimed_dbc_fees: 703028314,
    total_dbc_fees: 903028316,
    unclaimed_damm_v2_fees: 0,
    total_damm_v2_fees: 0,
    unclaimed_fees: 703028314,
    total_fees: 903028316
  },
  updatedAt: '2025-10-24T23:18:12.389258Z'
}

export const mockUserCoinHasBalance = {
  ticker: mockArtistCoin.ticker,
  mint: mockArtistCoin.mint,
  decimals: 5,
  logo_uri: mockArtistCoin.logo_uri,
  // Should match the sum of all the balances in the accounts array
  balance: 8943183931062 + 2806208545 + 3406392544,
  balance_usd: 0.418136809630839 + 0.062363526989732576 + 0.002378729223560982,
  accounts: [
    {
      account: 'oawndawoudnaoudnaoudnwaoudnwadouw',
      owner: 'TESTACCOUNTWALLETADDRESS',
      balance: 2806208545,
      balance_usd: 0.418136809630839,
      is_in_app_wallet: false
    },

    {
      account: '66HEii2PVGsrZdjqdVvUV8LfLgJTeWQTnK6jhznt2Tqe',
      owner: 'TESTACCOUNTWALLETADDRESS2',
      balance: 8943183931062,
      balance_usd: 0.062363526989732576,
      is_in_app_wallet: false
    },
    {
      account: '7jRr2NrnueGfRyEbaeuVYB8fRqvN2d9Ly8aXhh4tYAak',
      owner: '5tcMBYwoVCiaD6pVVhpsge9esJ8Moek25Ce64PrGQmND',
      balance: 3406392544,
      balance_usd: 0.002378729223560982,
      is_in_app_wallet: true
    }
  ]
}

export const mockUserCoinNoBalance = {
  ticker: mockArtistCoin.ticker,
  mint: mockArtistCoin.mint,
  decimals: mockArtistCoin.decimals,
  has_discord: mockArtistCoin.has_discord,
  owner_id: mockArtistCoin.owner_id,
  logo_uri: mockArtistCoin.logo_uri,
  balance: 0,
  balance_usd: 0,
  accounts: []
}

export const mockCoinMembers = [
  {
    user_id: '0Yva6m',
    balance: 5087677917
  },
  {
    user_id: '80w62ZO',
    balance: 5087677917
  },
  {
    user_id: 'lv7wo8A',
    balance: 4303499835
  },
  {
    user_id: 'D809W',
    balance: 4302661453
  },
  {
    user_id: '07wAJpk',
    balance: 2806208545
  },
  {
    user_id: 'jNYPWaV',
    balance: 2806208545
  },
  {
    user_id: '4WX8w1E',
    balance: 2806208545
  },
  {
    user_id: 'rmmRj8',
    balance: 1862387572
  },
  {
    user_id: 'MaMyR2V',
    balance: 1286980360
  },
  {
    user_id: 'OPNajKX',
    balance: 900000000
  },
  {
    user_id: 'lZ2KY6Z',
    balance: 817613250
  },
  {
    user_id: '51Aq2',
    balance: 430460008
  },
  {
    user_id: 'OWa0jgR',
    balance: 374329236
  },
  {
    user_id: '80z0ybW',
    balance: 349201214
  },
  {
    user_id: 'ngNmq',
    balance: 140363252
  },
  {
    user_id: 'eGrya',
    balance: 140363252
  },
  {
    user_id: 'oGNW6A2',
    balance: 140363252
  },
  {
    user_id: 'X6bNkjy',
    balance: 134150928
  },
  {
    user_id: 'AEJWBv',
    balance: 42847000
  },
  {
    user_id: 'ebWQP',
    balance: 10000000
  }
]
