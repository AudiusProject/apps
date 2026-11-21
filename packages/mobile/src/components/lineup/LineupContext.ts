import { createContext } from 'react'

export type LineupContextValue = {
  isOnArtistsTracksTab: boolean
}

export const LineupContext = createContext<LineupContextValue>({
  isOnArtistsTracksTab: false
})
