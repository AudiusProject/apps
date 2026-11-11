import type { ComponentPropsWithoutRef, ReactNode } from 'react'

export type TrackRowProps = {
  /** 1-based position shown in the leading cell. Omit for unranked lists. */
  rank?: number
  /** 40px square artwork. Rendered as given, inside a fixed-size cell. */
  artwork?: ReactNode
  /** Track title. Usually a link; the row ellipsizes it. */
  title: ReactNode
  /** Artist line under the title. */
  subtitle?: ReactNode
  /** Pre-formatted play count, e.g. "6.6K". */
  playCount?: string
  /**
   * Shown before the play count, e.g. a price pill on a locked track or an
   * access label. Buttons inside it don't toggle playback.
   */
  status?: ReactNode
  /** Pre-formatted duration, e.g. "2:30". */
  duration?: string
  /** This track is the one loaded in the player. */
  isActive?: boolean
  /** This track is the one loaded in the player and audio is playing. */
  isPlaying?: boolean
  isFavorited?: boolean
  /** Renders skeletons in every cell and disables interaction. */
  isLoading?: boolean
  isDisabled?: boolean
  /** Fires when the row, its play button or its artwork is clicked. */
  onTogglePlay?: () => void
  /** When omitted, the favorite cell stays empty. */
  onToggleFavorite?: () => void
  /** Overflow menu trigger. Hidden until hover or focus. */
  menu?: ReactNode
  /**
   * One short line above the row, aligned with the title column, for
   * context such as "Artist Pick". Adds 16px to the row's height.
   */
  context?: ReactNode
  /** Accessible name for the play button. */
  playLabel?: string
  /** Accessible name for the favorite button. */
  favoriteLabel?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'onClick'>
