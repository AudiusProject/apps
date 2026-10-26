// 32px icon + 8px top padding + 1px top border
export const BOTTOM_BAR_HEIGHT = 41
// Accounting for border
// see: https://github.com/facebook/react-native/issues/23994
export const BOTTOM_BAR_BUTTON_HEIGHT = 32
export const BOTTOM_BAR_TOP_PADDING = 8

// Floating glass pill (iOS 26). It takes up the same space as the classic bar
// (BOTTOM_BAR_HEIGHT plus the bottom inset), so screens, BottomChin and the
// now-playing drawer don't need to know which one is showing. The pill drops
// into the home indicator area to make room.
export const FLOATING_BAR_HEIGHT = 54
export const FLOATING_BAR_SIDE_MARGIN = 16
// Gap above the pill, between it and the play bar pill when a track is loaded.
export const FLOATING_BAR_TOP_GAP = 6
// Space between the edge of the pill and the highlight behind the active tab.
export const FLOATING_BAR_INDICATOR_INSET = 4
