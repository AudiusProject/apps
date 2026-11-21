import { ComputedCollectionProperties, UserCollectionMetadata } from '~/models'
import {
  USDCPurchaseConditions,
  UserTrackMetadata,
  ComputedTrackProperties
} from '~/models/Track'

export type PayExtraAmountPresetValues = {
  [PayExtraPreset.LOW]: number
  [PayExtraPreset.MEDIUM]: number
  [PayExtraPreset.HIGH]: number
}

export enum PayExtraPreset {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CUSTOM = 'custom',
  NONE = 'none'
}

export type PurchaseableAlbumStreamMetadata = UserCollectionMetadata &
  ComputedCollectionProperties & {
    stream_conditions: USDCPurchaseConditions
  }

export type PurchaseableTrackStreamMetadata = UserTrackMetadata &
  ComputedTrackProperties & {
    stream_conditions: USDCPurchaseConditions
  }

export type PurchaseableTrackDownloadMetadata = UserTrackMetadata &
  ComputedTrackProperties & {
    download_conditions: USDCPurchaseConditions
  }

export type PurchaseableContentMetadata =
  | PurchaseableTrackStreamMetadata
  | PurchaseableTrackDownloadMetadata
  | PurchaseableAlbumStreamMetadata

export const isContentDownloadGated = (
  metadata?: PurchaseableContentMetadata
): metadata is PurchaseableTrackDownloadMetadata =>
  !!metadata && 'is_download_gated' in metadata

export type USDCPurchaseConfig = {
  minContentPriceCents: number
  maxContentPriceCents: number
  minUSDCPurchaseAmountCents: number
  maxUSDCPurchaseAmountCents: number
}

export type PurchasePage = 'purchase' | 'crypto-transfer'
