import { Link as RouterLink, LinkProps } from 'react-router-dom'

import {
  RestrictionType,
  useRequiresAccountOnClick
} from 'hooks/useRequiresAccount'

export type RestrictedLinkProps = LinkProps & {
  restriction?: RestrictionType
  asChild?: boolean
}

export const RestrictedLink = ({
  onClick,
  restriction,
  children,
  ...props
}: RestrictedLinkProps) => {
  const handleClick = useRequiresAccountOnClick(
    (e) => onClick?.(e as any),
    [onClick],
    undefined,
    undefined,
    restriction
  )

  return (
    <RouterLink onClick={handleClick} {...props}>
      {children}
    </RouterLink>
  )
}
