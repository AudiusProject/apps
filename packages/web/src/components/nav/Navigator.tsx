import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { Client } from '@audius/common/models'
import cn from 'classnames'

import { useIsMobile } from 'hooks/useIsMobile'
import { getClient } from 'utils/clientUtil'

import styles from './Navigator.module.css'
import { LeftNav } from './desktop/LeftNav'
import { NavSidebarContext } from './desktop/NavSidebarContext'
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

  // Width is always the committed state — no intermediate values during drag.
  // The sidebar stays put while dragging; on release it animates to the new state.
  const navWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH

  const dragStartX = useRef(0)
  const dragStartCollapsed = useRef(false)
  const previousNavWidth = useRef(navWidth)

  const setIsCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {}
  }, [])

  // Update app-level nav vars before paint. When nav width changes, use FLIP:
  // commit the new layout width once, then animate a transform back to zero.
  useLayoutEffect(() => {
    const appEl = document.getElementById('webPlayer')
    if (!appEl) return

    const previousWidth = previousNavWidth.current
    const didWidthChange = previousWidth !== navWidth
    const shiftDelta = previousWidth - navWidth

    appEl.style.setProperty('--nav-width', `${navWidth}px`)
    appEl.style.setProperty('--nav-width-minus-border', `${navWidth - 1}px`)

    if (!isMobile && didWidthChange) {
      appEl.style.setProperty('--nav-shift', `${shiftDelta}px`)
      // Flush the starting transform before animating back to zero.
      appEl.getBoundingClientRect()
      appEl.style.setProperty('--nav-shift', '0px')
    } else {
      appEl.style.setProperty('--nav-shift', '0px')
    }

    previousNavWidth.current = navWidth
  }, [isMobile, navWidth])

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
      const absDelta = Math.abs(delta)
      let commit: boolean
      if (absDelta < SNAP_DELTA) {
        // Treat as a click — toggle the sidebar
        commit = !dragStartCollapsed.current
      } else {
        // was collapsed: stay unless dragged right past threshold
        // was expanded: collapse only if dragged left past threshold
        commit = dragStartCollapsed.current
          ? delta <= SNAP_DELTA
          : delta < -SNAP_DELTA
      }
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
