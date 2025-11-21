export enum PurchaseMethod {
  BALANCE = 'balance',
  ARTIST_COIN = 'artist_coin',
  CARD = 'card',
  CRYPTO = 'crypto',
  WALLET = 'wallet'
}

export enum PurchaseVendor {
  STRIPE = 'Stripe',
  COINFLOW = 'Coinflow'
}

export enum PurchaseAccess {
  STREAM = 'stream',
  DOWNLOAD = 'download'
}

export type GatedContentStatus = null | 'UNLOCKING' | 'UNLOCKED' | 'LOCKED'
