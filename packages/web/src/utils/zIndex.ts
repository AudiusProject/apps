/* eslint-disable @typescript-eslint/no-duplicate-enum-values */

/**
 * Standardize the use of zIndex across the application
 *
 * NOTE: default modal zIndex is 10,000 and the modal bg is 9,999
 */

export enum zIndex {
  // These are still set in css, added here for reference
  // TODO: use these enums

  // Harmony buttons use a zIndex for their icons which can put them above
  // other elements that get promoted to gpu layers
  SVG_BUTTON_ICONS = 1,
  REMIX_CONTEST_COUNT_DOWN = 1,

  GATED_TRACK_TILE_CORNER_TAG = 3,
  // Legacy tabs component from useTabs()
  TAB_ACCENT = 9,
  PROFILE_EDIT_MASK = 10,
  PROFILE_EDITABLE_COMPONENTS = 11,

  // FROSTED_HEADER_BACKGROUND = 10,
  // HEADER_CONTAINER = 13,
  // NAVIGATOR = 14,
  NAVIGATOR_POPUP = 15,
  NAVIGATOR_POPUP_OVERFLOW_POPUP = 16,
  FOLLOW_RECOMMENDATIONS_POPUP = 17,

  UPLOAD_SUBMIT_BAR = 50,

  NAV_BANNER_POPUP = 101,

  FORM_PAGE_FOOTER = 200,

  // Set to 1000 to account for nested modals inside, which take a higher z-index
  EDIT_TRACK_MODAL = 1000,
  CREATE_PLAYLIST_MODAL = 1000,
  EDIT_PLAYLIST_MODAL = 1001,
  IMAGE_SELECTION_POPUP = 1002,

  MUSIC_CONFETTI = 10000,
  REOWN_APPKIT_MODAL = 10002,
  MODAL_OVERFLOW_MENU_POPUP = 10002,
  PREMIUM_CONTENT_PURCHASE_MODAL = 10002,
  ADD_FUNDS_MODAL = 10003,
  ADD_FUNDS_VENDOR_SELECTION_DRAWER = 10004,
  USDC_MANUAL_TRANSFER_MODAL = 10004,
  USDC_ADD_FUNDS_FILTER_BUTTON_POPUP = 10005,
  STEMS_AND_DOWNLOADS_FILTER_BUTTON_POPUP = 10005,
  COINFLOW_ONRAMP_MODAL = 10006,
  BUY_SELL_MODAL = 10007,
  ARTIST_POPOVER_POPUP = 20000,
  PLAY_BAR_POPUP_MENU = 20001,
  FEATURE_FLAG_OVERRIDE_MODAL = 30000,
  CASH_WALLET_TOOLTIP = 30001,

  STRIPE_ONRAMP_MODAL_BACKGROUND = 1000000000,
  TOAST = 1000000001,
  SOMETHING_WRONG_PAGE = 100000000000000000000
}

export default zIndex
