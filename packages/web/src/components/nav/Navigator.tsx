import { Client } from '@audius/common/models'
import cn from 'classnames'

import { useIsMobile } from 'hooks/useIsMobile'
import { getClient } from 'utils/clientUtil'

import styles from './Navigator.module.css'
import { LeftNav } from './desktop/LeftNav'
import ConnectedNavBar from './mobile/ConnectedNavBar'

interface OwnProps {
  className?: string
}

// Navigation component that renders the NavBar for mobile
// and LeftNav for desktop
const Navigator = ({ className }: OwnProps) => {
  const client = getClient()
  const isMobile = useIsMobile()

  const isElectron = client === Client.ELECTRON

  return (
    <div
      className={cn(styles.navWrapper, className, {
        [styles.leftNavWrapper]: !isMobile,
        [styles.isElectron]: isElectron
      })}
    >
      {isMobile ? (
        <ConnectedNavBar />
      ) : (
        <LeftNav isElectron={client === Client.ELECTRON} />
      )}
    </div>
  )
}

export default Navigator
