/**
 * Audius Breakpoint System
 *
 * Standard breakpoints for responsive design. These values align with common
 * device sizes and are used throughout the application for consistent
 * responsive behavior.
 */

export const breakpoints = {
  values: {
    /**
     * Extra small devices (portrait phones)
     */
    xs: 480,
    /**
     * Small devices (landscape phones)
     */
    sm: 768,
    /**
     * Medium devices (tablets)
     */
    md: 1024,
    /**
     * Large devices (desktops)
     */
    lg: 1280,
    /**
     * Extra large devices (large desktops)
     */
    xl: 1440
  },

  /**
   * Media query strings for max-width (smaller than breakpoint)
   */
  down: {
    /**
     * @example (max-width: 480px)
     * Smaller than xs breakpoint (mobile phones)
     */
    xs: `(max-width: 480px)`,
    /**
     * @example (max-width: 768px)
     * Smaller than sm breakpoint (includes mobile phones and small tablets)
     */
    sm: `(max-width: 768px)`,
    /**
     * @example (max-width: 1024px)
     * Smaller than md breakpoint (includes mobile phones, tablets, and small laptops)
     */
    md: `(max-width: 1024px)`,
    /**
     * @example (max-width: 1280px)
     * Smaller than lg breakpoint (includes all except large desktops)
     */
    lg: `(max-width: 1280px)`,
    /**
     * @example (max-width: 1440px)
     * Smaller than xl breakpoint
     */
    xl: `(max-width: 1440px)`
  },

  /**
   * Media query strings for min-width (larger than breakpoint)
   */
  up: {
    /**
     * @example (min-width: 481px)
     * Larger than xs breakpoint (tablets and above)
     */
    xs: `(min-width: 481px)`,
    /**
     * @example (min-width: 769px)
     * Larger than sm breakpoint (desktops and above)
     */
    sm: `(min-width: 769px)`,
    /**
     * @example (min-width: 1025px)
     * Larger than md breakpoint (larger desktops)
     */
    md: `(min-width: 1025px)`,
    /**
     * @example (min-width: 1281px)
     * Larger than lg breakpoint (large desktops)
     */
    lg: `(min-width: 1281px)`,
    /**
     * @example (min-width: 1441px)
     * Larger than xl breakpoint (extra large desktops)
     */
    xl: `(min-width: 1441px)`
  },

  /**
   * Media query strings for ranges between breakpoints
   */
  between: {
    /**
     * @example (min-width: 481px) and (max-width: 768px)
     * Between xs and sm breakpoints (small tablets)
     */
    xs_sm: `(min-width: 481px) and (max-width: 768px)`,
    /**
     * @example (min-width: 769px) and (max-width: 1024px)
     * Between sm and md breakpoints (tablets)
     */
    sm_md: `(min-width: 769px) and (max-width: 1024px)`,
    /**
     * @example (min-width: 1025px) and (max-width: 1280px)
     * Between md and lg breakpoints (small desktops)
     */
    md_lg: `(min-width: 1025px) and (max-width: 1280px)`,
    /**
     * @example (min-width: 1281px) and (max-width: 1440px)
     * Between lg and xl breakpoints (medium desktops)
     */
    lg_xl: `(min-width: 1281px) and (max-width: 1440px)`
  },

  /**
   * Helper function to create a custom media query
   * @param minWidth minimum width in pixels
   * @param maxWidth maximum width in pixels
   * @returns media query string
   */
  createCustomQuery: (minWidth?: number, maxWidth?: number): string => {
    if (minWidth && maxWidth) {
      return `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`
    }
    if (minWidth) {
      return `(min-width: ${minWidth}px)`
    }
    if (maxWidth) {
      return `(max-width: ${maxWidth}px)`
    }
    return ''
  }
}
