import { useCallback, MouseEvent } from 'react'

import { useUser } from '@audius/common/api'
import { ID } from '@audius/common/models'
import { Text, useTheme } from '@audius/harmony'

import { TextLink, TextLinkProps } from 'components/link'

type VanityMetricProps = TextLinkProps

export const VanityMetric = (props: VanityMetricProps) => {
  const { children, onClick, ...other } = props
  const { spacing } = useTheme()
  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.stopPropagation()
      onClick?.(e)
    },
    [onClick]
  )
  return (
    <TextLink
      variant='subdued'
      size='xs'
      applyHoverStylesToInnerSvg
      noUnderlineOnHover
      css={{
        gap: spacing.xs,
        alignItems: 'center',
        flexWrap: 'nowrap',
        whiteSpace: 'nowrap'
      }}
      onClick={handleClick}
      {...other}
    >
      {children}
    </TextLink>
  )
}

export const UserName = (props: { userId: ID }) => {
  const { userId } = props
  const { data: userName } = useUser(userId, { select: (user) => user?.name })

  return <Text>{userName}</Text>
}
