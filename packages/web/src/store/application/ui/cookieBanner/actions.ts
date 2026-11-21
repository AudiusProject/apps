export const SHOW_COOKIE_BANNER = 'COOKIE_BANNER/SHOW'
export const DISMISS_COOKIE_BANNER = 'COOKIE_BANNER/DISMISS'

export const showCookieBanner = () => ({
  type: SHOW_COOKIE_BANNER
})

export const dismissCookieBanner = () => ({
  type: DISMISS_COOKIE_BANNER
})

export type CookieBannerAction =
  | ReturnType<typeof showCookieBanner>
  | ReturnType<typeof dismissCookieBanner>
