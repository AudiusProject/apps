import { useCallback } from 'react'

import { Button, ButtonType } from '@audius/stems'
import clsx from 'clsx'
import { matchPath, useNavigate, useLocation } from 'react-router'

import { navRoutes } from 'utils/routes'

import styles from './Nav.module.css'

type NavButtonProps = {
  matchParams: {
    path: string
    exact?: boolean
  }[]
  baseRoute: string
  text: string
  pushRoute: (path: string) => void
}

const NavButton = (props: NavButtonProps) => {
  const { pushRoute, baseRoute } = props
  const location = useLocation()

  const isActiveRoute = props.matchParams.some(
    (matchParam) => !!matchPath(matchParam, location.pathname)
  )
  const onButtonClick = useCallback(
    () => pushRoute(baseRoute),
    [baseRoute, pushRoute]
  )

  return (
    <Button
      text={props.text}
      type={ButtonType.GLASS}
      className={clsx(styles.navButton, { [styles.active]: isActiveRoute })}
      textClassName={clsx(styles.navButtonText)}
      onClick={onButtonClick}
    />
  )
}

const Nav = () => {
  const navigate = useNavigate()
  return (
    <div className={styles.container}>
      {navRoutes.map((route) => (
        <div key={route.text} className={styles.btnContainer}>
          <NavButton {...route} pushRoute={(path) => navigate(path)} />
        </div>
      ))}
    </div>
  )
}

export default Nav
