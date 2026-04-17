/**
 * Shared column width constants used across table components.
 * minWidth and width must match to ensure the responsive budget
 * calculation (which uses minWidth) accurately reflects the flex
 * layout floor (flex-shrink: 0 means columns don't shrink below width).
 */
export const COLUMN_WIDTHS = {
  numeric: 72,
  date: 72,
  trackActions: 112,
  overflowMenu: 64,
  playButton: 48,
  artistName: 180,
  spacer: 24
} as const
