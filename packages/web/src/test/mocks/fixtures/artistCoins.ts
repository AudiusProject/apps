import { Id } from '@audius/sdk'

export const mockArtistCoin = {
  ticker: 'MOCK',
  name: 'Mock Coin',
  mint: 'abcedfg1234567890',
  decimals: 9,
  owner_id: Id.parse(1),
  logo_uri:
    'https://s3.coinmarketcap.com/static-gravity/image/a28128d9ff7c49c9ad33ee2f626fda40.png',
  description:
    '$MOCK is a community token on the Audius platform. You can use $MOCK for tipping artists, participating in community activities, and engaging with the decentralized music ecosystem.\n\nHolding $MOCK gives you access to exclusive features and helps support your favorite artists on Audius.',
  website: 'https://coinmarketcap.com/currencies/mock/',
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
    unclaimed_dbc_fees: 903028314,
    total_dbc_fees: 903028316,
    unclaimed_damm_v2_fees: 0,
    total_damm_v2_fees: 0,
    unclaimed_fees: 903028314,
    total_fees: 903028316
  },
  updatedAt: '2025-10-24T23:18:12.389258Z'
}

export const mockCoinHoldings = {
  ticker: mockArtistCoin.ticker,
  mint: mockArtistCoin.mint,
  decimals: 5,
  logo_uri: mockArtistCoin.logo_uri,
  balance: 2806208545,
  balance_usd: 0.418136809630839,
  accounts: [
    {
      account: '9VEzg6NinLCGecKkcR3m3B6xSdKbz9fM6eYm12932NGU',
      owner: 'FiFMKTVf8rCQjyxiQHgt3tqZ8LYPytmvakZ9ZRZ5cgHi',
      balance: 2806208545,
      balance_usd: 0.418136809630839,
      is_in_app_wallet: false
    }
  ]
}
