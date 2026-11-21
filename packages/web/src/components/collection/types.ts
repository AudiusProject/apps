import { ChangeEvent } from 'react'

import { AccessConditions, AccessPermissions, ID } from '@audius/common/models'
import { CollectionsPageType } from '@audius/common/store'
import { Nullable } from '@audius/common/utils'

export type CollectionHeaderProps = {
  isStreamGated: Nullable<boolean>
  isPlayable: boolean
  isPublished: boolean
  tracksLoading: boolean
  loading: boolean
  playing: boolean
  previewing: boolean
  isOwner: boolean
  isAlbum: boolean
  access: Nullable<AccessPermissions>
  collectionId: ID
  ownerId: Nullable<ID>
  type: CollectionsPageType
  title: string
  artistName: string
  description: string
  artistHandle: string
  releaseDate: string | number
  lastModifiedDate?: string | number
  numTracks: number
  duration: number
  userId: Nullable<ID>
  reposts: number
  saves: number
  streamConditions: Nullable<AccessConditions>
  onClickReposts?: () => void
  onClickFavorites?: () => void
  onPlay: () => void
  onPreview: () => void
  onFilterChange?: (e: ChangeEvent<HTMLInputElement>) => void
}
