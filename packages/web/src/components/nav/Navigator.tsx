import { Client } from '@audius/common/models'
import cn from 'classnames'

import { useIsMobile } from 'hooks/useIsMobile'
import { getClient } from 'utils/clientUtil'

import styles from './Navigator.module.css'
import { LeftNav } from './desktop/LeftNav'
import ConnectedNavBar from './mobile/ConnectedNavBar'

// Extend Window interface for React Native WebView
declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

interface OwnProps {
  className?: string
}

// Navigation component that renders the NavBar for mobile
// and LeftNav for desktop
const Navigator = ({ className }: OwnProps) => {
  const client = getClient()
  const isMobile = useIsMobile()

  const isElectron = client === Client.ELECTRON

  // Hide navigation when in a React Native WebView (e.g., mobile app WebView)
  const isInWebView =
    typeof window !== 'undefined' && window.ReactNativeWebView !== undefined

  if (isInWebView) {
    return null
  }

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
