import { EthTokenStandard } from '~/models'
import { Nullable } from '~/utils'

type AssetContract = {
  address: Nullable<string>
  asset_contract_type: string
  created_date: string
  name: string
  nft_version: string
  opensea_version: Nullable<string>
  owner: Nullable<number>
  schema_name: EthTokenStandard
  symbol: string
  description: Nullable<string>
  external_link: Nullable<string>
  image_url: Nullable<string>
}

export type OpenSeaCollection = {
  collection: string
  name: string
  description: string
  image_url: string
}

type AssetPerson = {
  user: {
    username: string
  }
  address: string
} | null
type AssetOwner = AssetPerson
type AssetCreator = AssetPerson

// This metadata object is absurd. It is the combination of
// some real standards and some just random fields we get back.
// Use it to try to display whatever we can. Yay NFTs.
export type OpenSeaNftMetadata = {
  token_id?: string
  name?: string
  description?: string
  external_url?: string
  permalink?: string
  image?: string
  image_url?: string
  image_preview_url?: string
  image_thumbnail_url?: string
  image_original_url?: string
  animation_url?: string
  animation_original_url?: string
  youtube_url?: string
  background_color?: string
  owner?: AssetOwner
  creator?: AssetCreator
  asset_contract?: AssetContract
}

export type OpenSeaNft = {
  identifier: string
  collection: string
  contract: string
  token_standard: EthTokenStandard
  name: string
  description: string
  image_url: string
  metadata_url: string
  opensea_url: string
  // Audius added fields
  wallet: string
}

export type OpenSeaNftExtended = OpenSeaNft &
  OpenSeaNftMetadata & { collectionMetadata?: OpenSeaCollection }

export type OpenSeaEvent = {
  id: number
  event_timestamp: number
  from_address: string
  to_address: string
  nft: OpenSeaNft
  wallet: string
}

export type OpenSeaEventExtended = Omit<OpenSeaEvent, 'nft'> & {
  nft: OpenSeaNftExtended
}
