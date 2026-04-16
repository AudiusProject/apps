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
const SNAP_DELTA = 20 // px of drag needed to commit a state change
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
  const [dragWidth, setDragWidth] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartX = useRef(0)
  const dragStartCollapsed = useRef(false)

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {}
  }, [])

  const navWidth = dragWidth ?? (isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)

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

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(
        COLLAPSED_WIDTH,
        Math.min(EXPANDED_WIDTH, e.clientX)
      )
      setDragWidth(newWidth)
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      setDragWidth(null)

      const delta = e.clientX - dragStartX.current
      if (dragStartCollapsed.current) {
        // Was collapsed: expand if dragged right far enough
        if (delta > SNAP_DELTA) setIsCollapsed(false)
      } else {
        // Was expanded: collapse if dragged left far enough
        if (delta < -SNAP_DELTA) setIsCollapsed(true)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
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
        style={
          !isMobile
            ? {
                width: navWidth,
                overflow: isDragging ? 'hidden' : undefined
              }
            : undefined
        }
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
