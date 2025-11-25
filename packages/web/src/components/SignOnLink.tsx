import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'
import { Link, LinkProps, useLocation } from 'react-router-dom'

import {
  updateRouteOnCompletion,
  updateRouteOnExit
} from 'common/store/pages/signon/actions'

const { SIGN_IN_PAGE, SIGN_UP_PAGE } = route

export type SignOnLinkProps = Omit<LinkProps, 'to'> & {
  asChild?: boolean
  signIn?: boolean
  signUp?: boolean
}

export const SignOnLink = ({
  onClick,
  children,
  signIn = false,
  signUp = true,
  ...props
}: SignOnLinkProps) => {
  const dispatch = useDispatch()
  const { pathname } = useLocation()

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      dispatch(updateRouteOnCompletion(pathname))
      dispatch(updateRouteOnExit(pathname))
      onClick?.(e)
    },
    [dispatch, onClick, pathname]
  )

  const to = signIn ? SIGN_IN_PAGE : signUp ? SIGN_UP_PAGE : SIGN_UP_PAGE

  return (
    <Link to={to} onClick={handleClick} {...props}>
      {children}
    </Link>
  )
}
