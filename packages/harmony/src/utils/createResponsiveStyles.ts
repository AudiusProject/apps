import { CSSObject } from '@emotion/react'

import { useMedia } from '../hooks/useMedia'

type MediaContextType = ReturnType<typeof useMedia>

type ResponsiveStyleValue = CSSObject | ((media: MediaContextType) => CSSObject)

type ResponsiveStyleConfig = {
  base?: ResponsiveStyleValue
  mobile?: ResponsiveStyleValue
  tablet?: ResponsiveStyleValue
  desktop?: ResponsiveStyleValue
}

type NamedResponsiveStylesConfig = {
  [styleKey: string]: ResponsiveStyleConfig
}

/**
 * Creates a single merged style object based on the current media breakpoints.
 * Applies base styles first, then overrides with styles for the active breakpoint
 * (mobile, tablet, or desktop). Style values can be objects or functions
 * receiving the media state for complex logic.
 *
 * Priority: base -> mobile -> tablet -> desktop (later stages override earlier ones)
 *
 * @param media - The media context object from useMedia()
 * @param config - Style configuration for different breakpoints
 * @returns A merged CSS object with styles applied according to breakpoints
 */
export const createResponsiveStyle = (
  media: MediaContextType,
  config: ResponsiveStyleConfig
): CSSObject => {
  const finalStyles: CSSObject = {}

  const applyStyles = (styleSource: ResponsiveStyleValue | undefined) => {
    if (!styleSource) return
    if (typeof styleSource === 'function') {
      Object.assign(finalStyles, styleSource(media))
    } else if (typeof styleSource === 'object') {
      Object.assign(finalStyles, styleSource)
    }
  }

  applyStyles(config.base)

  if (media.isMobile) applyStyles(config.mobile)
  if (media.isTablet) applyStyles(config.tablet)
  if (media.isDesktop) applyStyles(config.desktop)

  return finalStyles
}

/**
 * Creates multiple responsive style objects as a convenience for components
 * that need several different styled elements.
 *
 * Each style configuration follows the same pattern as createResponsiveStyle,
 * with base, mobile, tablet, and desktop style definitions.
 *
 * @example
 * ```
 * const styles = createResponsiveStyles(media, {
 *   buttonStyles: { base: {...}, mobile: {...} },
 *   headerStyles: { base: {...}, tablet: {...} }
 * })
 *
 * // Usage
 * <Button css={styles.buttonStyles}>Click me</Button>
 * <Header css={styles.headerStyles}>Title</Header>
 * ```
 *
 * @param media - The media context object from useMedia()
 * @param configs - Object with named style configurations
 * @returns Object with the same keys, but values processed into responsive styles
 */
export const createResponsiveStyles = <T extends NamedResponsiveStylesConfig>(
  media: MediaContextType,
  configs: T
): { [K in keyof T]: CSSObject } => {
  const result = {} as { [K in keyof T]: CSSObject }

  for (const key in configs) {
    result[key] = createResponsiveStyle(media, configs[key])
  }

  return result
}
