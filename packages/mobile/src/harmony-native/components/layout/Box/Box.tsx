import styled from '@emotion/native'
import { View } from 'react-native'

import type { BoxProps } from './types'

const invalidProps = [
  'h',
  'w',
  'p',
  'ph',
  'pv',
  'pt',
  'pl',
  'pr',
  'pb',
  'm',
  'mh',
  'mv',
  'mt',
  'ml',
  'mr',
  'mb',
  'backgroundColor',
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'borderTopLeftRadius',
  'shadow',
  'alignSelf',
  'flex'
]

export const Box = styled(View, {
  shouldForwardProp: (prop) => !invalidProps.includes(prop)
})<BoxProps>(({
  h,
  w,
  p,
  ph,
  pv,
  pt,
  pl,
  pr,
  pb,
  m,
  mh,
  mv,
  mt,
  ml,
  mr,
  mb,
  backgroundColor,
  border,
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderRadius,
  borderTopRightRadius,
  borderBottomRightRadius,
  borderBottomLeftRadius,
  borderTopLeftRadius,
  shadow,
  alignSelf,
  flex,
  theme
}) => {
  const { spacing, color, cornerRadius, shadows } = theme
  const padT = pt ?? pv ?? p
  const padB = pb ?? pv ?? p
  const padL = pl ?? ph ?? p
  const padR = pr ?? ph ?? p

  const marginT = mt ?? mv ?? m
  const marginB = mb ?? mv ?? m
  const marginL = ml ?? mh ?? m
  const marginR = mr ?? mh ?? m

  return {
    position: 'relative',
    boxSizing: 'border-box',
    height: h ? (spacing[h] ?? h) : h,
    width: w ? (spacing[w] ?? w) : w,
    ...(shadow && shadows[shadow]),
    paddingTop: padT && (spacing[padT] ?? padT),
    paddingLeft: padL && (spacing[padL] ?? padL),
    paddingRight: padR && (spacing[padR] ?? padR),
    paddingBottom: padB && (spacing[padB] ?? padB),
    marginTop: marginT && (spacing[marginT] ?? marginT),
    marginLeft: marginL && (spacing[marginL] ?? marginL),
    marginRight: marginR && (spacing[marginR] ?? marginR),
    marginBottom: marginB && (spacing[marginB] ?? marginB),
    backgroundColor:
      (backgroundColor && theme.color.background[backgroundColor]) ??
      backgroundColor ??
      (shadow ? color.background.white : undefined),
    ...(border && {
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: color.border[border]
    }),
    ...(borderTop && {
      borderStyle: 'solid',
      borderTopWidth: 1,
      borderTopColor: color.border[borderTop]
    }),
    ...(borderRight && {
      borderStyle: 'solid',
      borderRightWidth: 1,
      borderRightColor: color.border[borderRight]
    }),
    ...(borderBottom && {
      borderStyle: 'solid',
      borderBottomWidth: 1,
      borderBottomColor: color.border[borderBottom]
    }),
    ...(borderLeft && {
      borderStyle: 'solid',
      borderLeftWidth: 1,
      borderLeftColor: color.border[borderLeft]
    }),
    borderRadius: borderRadius && cornerRadius[borderRadius],
    borderTopRightRadius:
      borderTopRightRadius && cornerRadius[borderTopRightRadius],
    borderBottomRightRadius:
      borderBottomRightRadius && cornerRadius[borderBottomRightRadius],
    borderBottomLeftRadius:
      borderBottomLeftRadius && cornerRadius[borderBottomLeftRadius],
    borderTopLeftRadius:
      borderTopLeftRadius && cornerRadius[borderTopLeftRadius],
    flex,
    alignSelf
  }
})
