import { CSSObject, useTheme } from '@emotion/react'

import { DividerProps } from './types'

/**
 * A separator between two elements, usually consisting of a horizontal or vertical line.
 */
export const Divider = (props: DividerProps) => {
  const {
    orientation = 'horizontal',
    children,
    color = 'strong',
    className
  } = props
  const theme = useTheme()
  const border = `1px solid ${theme.color.border[color]}`

  const css: CSSObject = {
    border: 'none',
    margin: 0,
    ...(children &&
      orientation === 'horizontal' && {
        display: 'flex',
        gap: theme.spacing.s,
        whiteSpace: 'nowrap',
        textAlign: 'center',
        border: 0,
        '&::before, &::after': {
          content: '""',
          alignSelf: 'center',
          width: '100%',
          borderTop: border
        }
      }),
    ...(!children &&
      orientation === 'vertical' && {
        borderRight: border,
        alignSelf: 'stretch',
        height: 'auto'
      }),
    ...(!children &&
      orientation === 'horizontal' && {
        borderBottom: border,
        flex: 1
      })
  }

  const Root = children ? 'div' : 'hr'
  const role = children ? 'separator' : undefined

  return (
    <Root role={role} css={css} className={className}>
      {children}
    </Root>
  )
}
