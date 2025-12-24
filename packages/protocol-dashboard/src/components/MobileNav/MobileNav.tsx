import { useCallback } from 'react'

import { IconAudiusLogoHorizontal } from '@audius/harmony'
import { Button, ButtonType, IconRemove } from '@audius/stems'
import clsx from 'clsx'
import { matchPath, useNavigate, useLocation } from 'react-router'

import useOpenLink from 'hooks/useOpenLink'
import { AUDIUS_DAPP_URL, navRoutes } from 'utils/routes'

import styles from './MobileNav.module.css'

const messages = {
  launchApp: 'LAUNCH THE APP',
  name: 'PROTOCOL DASHBOARD'
}

const MobileNavButton = ({
  baseRoute,
  matchParams,
  text,
  pushRoute,
  onClose
}) => {
  const location = useLocation()

  const isActiveRoute = matchParams.some(
    (matchParam) => !!matchPath(matchParam, location.pathname)
  )
  const onButtonClick = useCallback(() => {
    onClose()
    pushRoute(baseRoute)
  }, [baseRoute, pushRoute, onClose])

  return (
    <Button
      text={text}
      type={ButtonType.GLASS}
      className={clsx(styles.navButton, { [styles.active]: isActiveRoute })}
      textClassName={clsx(styles.navButtonText)}
      onClick={onButtonClick}
    />
  )
}

type LaunchTheAppButtonProps = {}
const LaunchTheAppButton = (props: LaunchTheAppButtonProps) => {
  const goToApp = useOpenLink(AUDIUS_DAPP_URL)
  return (
    <Button
      text={messages.launchApp}
      className={styles.launchAppBtn}
      textClassName={styles.launchAppBtnText}
      onClick={goToApp}
    />
  )
}

type MobileNavProps = {
  isOpen: boolean
  onClose: () => void
}

const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  const navigate = useNavigate()

  return (
    <div
      className={clsx(styles.container, {
        [styles.isOpen]: isOpen
      })}
    >
      <div className={styles.close} onClick={onClose}>
        <IconRemove />
      </div>
      <div className={styles.inner}>
        <div className={styles.top}>
          <IconAudiusLogoHorizontal color='inverse' className={styles.logo} />
          <div className={styles.name}>{messages.name}</div>
        </div>
        {navRoutes.map((route) => (
          <div key={route.text} className={styles.btnContainer}>
            <MobileNavButton
              {...route}
              onClose={onClose}
              pushRoute={(path) => navigate(path)}
            />
          </div>
        ))}
        <LaunchTheAppButton />
      </div>
    </div>
  )
}

export default MobileNav
