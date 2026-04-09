import { createContext } from 'react'

/**
 * Context shared by all tiles within a Lineup. Populated once by `Lineup`
 * so that per-tile subscriptions (e.g. `useNavigationState`) don't need to
 * run N times per list render.
 */
export type LineupContextValue = {
  /**
   * True when the lineup is rendered inside a profile "Tracks" tab — used
   * by `TrackTile` to hide the "View Artist Page" overflow action.
   */
  isOnArtistsTracksTab: boolean
}

export const LineupContext = createContext<LineupContextValue>({
  isOnArtistsTracksTab: false
})
