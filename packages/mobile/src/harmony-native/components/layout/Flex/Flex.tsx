import styled from '@emotion/native'

import { Box } from '../Box/Box'

import type { FlexProps } from './types'

const invalidProps = [
  'alignItems',
  'direction',
  'wrap',
  'gap',
  'rowGap',
  'columnGap'
]

export const Flex = styled(Box, {
  shouldForwardProp: (prop) => !invalidProps.includes(prop)
})<FlexProps>((props) => {
  const {
    theme,
    direction,
    wrap,
    alignItems,
    justifyContent,
    gap,
    rowGap,
    columnGap,
    row,
    column
  } = props
  const { spacing } = theme

  return {
    display: 'flex',
    alignItems,
    justifyContent,
    flexDirection: direction ?? (row ? 'row' : column ? 'column' : undefined),
    flexWrap: wrap,
    gap: gap && spacing[gap],
    rowGap: rowGap && spacing[rowGap],
    columnGap: columnGap && spacing[columnGap]
  }
})
