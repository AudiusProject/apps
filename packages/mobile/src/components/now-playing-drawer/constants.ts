import { BOTTOM_BAR_HEIGHT } from 'app/components/bottom-tab-bar'
import { useFullDrawerHeight } from 'app/components/drawer'

export const PLAY_BAR_HEIGHT = 52

export const useNowPlayingHeight = () =>
  useFullDrawerHeight() - BOTTOM_BAR_HEIGHT - PLAY_BAR_HEIGHT
