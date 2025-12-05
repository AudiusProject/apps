import { ReactElement } from 'react'

import { IconComponent } from '@audius/harmony'
import { Mood } from '@audius/sdk'

import { categories } from './categories'

export type ViewLayout = 'grid' | 'list'
export const viewLayoutOptions: { label: string; value: ViewLayout }[] = [
  { label: 'Grid', value: 'grid' },
  { label: 'List', value: 'list' }
]

// NOTE: This is different from SearchCategory because
// it uses `profiles` instead of `users`
export enum CategoryView {
  ALL = 'all',
  PROFILES = 'profiles',
  TRACKS = 'tracks',
  PLAYLISTS = 'playlists',
  ALBUMS = 'albums'
}

export const labelByCategoryView: Record<CategoryView, string> = {
  [CategoryView.ALL]: 'All',
  [CategoryView.PROFILES]: 'Profiles',
  [CategoryView.TRACKS]: 'Tracks',
  [CategoryView.PLAYLISTS]: 'Playlists',
  [CategoryView.ALBUMS]: 'Albums'
}

export type Filter =
  | 'genre'
  | 'mood'
  | 'key'
  | 'bpm'
  | 'isPremium'
  | 'hasDownloads'
  | 'isVerified'

export type Category = {
  filters: Filter[]
  icon?: IconComponent
}

export type MoodInfo = {
  label: Mood
  value: Mood
  icon: ReactElement
}

export type CategoryKey = keyof typeof categories
