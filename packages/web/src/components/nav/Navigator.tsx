import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Client } from '@audius/common/models'
import cn from 'classnames'

import { useIsMobile } from 'hooks/useIsMobile'
import { getClient } from 'utils/clientUtil'

import styles from './Navigator.module.css'
import { NavSidebarContext } from './desktop/NavSidebarContext'
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

const EXPANDED_WIDTH = 240
const COLLAPSED_WIDTH = 64
// px of drag needed to commit to the other state on release
const SNAP_DELTA = 15
const STORAGE_KEY = 'nav-sidebar-collapsed'

const Navigator = ({ className }: OwnProps) => {
  const client = getClient()
  const isMobile = useIsMobile()
  const isElectron = client === Client.ELECTRON

  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isDragging, setIsDragging] = useState(false)

  const dragStartX = useRef(0)
  const dragStartCollapsed = useRef(false)

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {}
  }, [])

  // Width is always the committed state — no intermediate values during drag.
  // The sidebar stays put while dragging; on release it animates to the new state.
  const navWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  // Update --nav-width on the app element before paint to avoid flash
  useLayoutEffect(() => {
    const appEl = document.getElementById('webPlayer')
    if (!appEl) return
    appEl.style.setProperty('--nav-width', `${navWidth}px`)
    appEl.style.setProperty('--nav-width-minus-border', `${navWidth - 1}px`)
  }, [navWidth])

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragStartX.current = e.clientX
      dragStartCollapsed.current = isCollapsed
      setIsDragging(true)
    },
    [isCollapsed]
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseUp = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      const commit = dragStartCollapsed.current
        ? delta <= SNAP_DELTA   // was collapsed: stay unless dragged right past threshold
        : delta < -SNAP_DELTA  // was expanded: collapse only if dragged left past threshold
      setIsCollapsed(commit)
      setIsDragging(false)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, setIsCollapsed])

  const isInWebView =
    typeof window !== 'undefined' && window.ReactNativeWebView !== undefined
  if (isInWebView) return null

  return (
    <NavSidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div
        className={cn(styles.navWrapper, className, {
          [styles.leftNavWrapper]: !isMobile,
          [styles.isElectron]: isElectron,
          [styles.isDragging]: isDragging
        })}
        style={!isMobile ? { width: navWidth } : undefined}
      >
        {isMobile ? (
          <ConnectedNavBar />
        ) : (
          <>
            <LeftNav isElectron={isElectron} />
            <div
              className={styles.resizeHandle}
              style={{ cursor: isCollapsed ? 'e-resize' : 'w-resize' }}
              onMouseDown={handleDragStart}
            />
          </>
        )}
      </div>
    </NavSidebarContext.Provider>
  )
}

export default Navigator
