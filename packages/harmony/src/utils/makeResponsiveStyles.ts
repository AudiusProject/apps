import { CSSObject, useTheme } from '@emotion/react'

import { useMedia } from '../contexts/MediaContext'

import { createResponsiveStyles } from './createResponsiveStyles'

type MediaContext = ReturnType<typeof useMedia>
type Theme = ReturnType<typeof useTheme>

/**
 * StylesOptions provides common objects needed for responsive style creation
 */
export type StylesOptions = {
  media: MediaContext
  theme: Theme
}

/**
 * Creates a custom hook for responsive styles that automatically injects
 * the media context and theme.
 *
 * Similar to makeStyles but specifically for responsive layout with built-in
 * media query support.
 *
 * @example
 * ```
 * // Define your styles
 * const useMyStyles = makeResponsiveStyles(({ media, theme }) => ({
 *   container: {
 *     base: { color: theme.colors.primary },
 *     mobile: { flexDirection: 'column' },
 *     tablet: { flexDirection: 'row' }
 *   },
 *   title: {
 *     base: { fontSize: theme.typography.xl },
 *     mobile: (currentMedia) => ({
 *       ...(currentMedia.isExtraSmall && { fontSize: theme.typography.l })
 *     })
 *   }
 * }))
 *
 * // Use in your component
 * function MyComponent() {
 *   const styles = useMyStyles()
 *   return <div css={styles.container}>...</div>
 * }
 * ```
 *
 * @param stylesCreator A function that takes media and theme objects and returns style configurations
 * @returns A custom hook that returns the processed styles
 */
export const makeResponsiveStyles = <Styles extends Record<string, CSSObject>>(
  stylesCreator: (options: StylesOptions) => Record<string, any>
) => {
  return function useStyles(): Styles {
    const media = useMedia()
    const theme = useTheme()

    const styleConfigs = stylesCreator({ media, theme })
    return createResponsiveStyles(media, styleConfigs) as Styles
  }
}
