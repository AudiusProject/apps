import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { Client } from '@audius/common/models'
import { createKeyboardActivationHandler } from '@audius/harmony'
import cn from 'classnames'
import { useLocation } from 'react-router'

import { useIsMobile } from 'hooks/useIsMobile'
import { getClient } from 'utils/clientUtil'

import styles from './Navigator.module.css'
import { LeftNav } from './desktop/LeftNav'
import { NavSidebarContext } from './desktop/NavSidebarContext'
import ConnectedNavBar from './mobile/ConnectedNavBar'

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
const SNAP_DELTA = 15
const STORAGE_KEY = 'nav-sidebar-collapsed'

const Navigator = ({ className }: OwnProps) => {
  const client = getClient()
  const isMobile = useIsMobile()
  const isElectron = client === Client.ELECTRON
  const location = useLocation()
  const hideMobileNav = isMobile && /\/contest(\/|$)/.test(location.pathname)

  const [isCollapsed, setIsCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })
  const [isDragging, setIsDragging] = useState(false)

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

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(!isCollapsed)
  }, [isCollapsed, setIsCollapsed])

  const handleResizeHandleKeyDown =
    createKeyboardActivationHandler<HTMLDivElement>({
      onActivate: toggleCollapsed
    })

  useEffect(() => {
    if (!isDragging) return

    const handleMouseUp = (e: MouseEvent) => {
      const delta = e.clientX - dragStartX.current
      const absDelta = Math.abs(delta)
      let commit: boolean
      if (absDelta < SNAP_DELTA) {
        commit = !dragStartCollapsed.current
      } else {
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
  if (isInWebView || hideMobileNav) return null

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
              onKeyDown={handleResizeHandleKeyDown}
              role='button'
              tabIndex={0}
              aria-label={
                isCollapsed
                  ? 'Expand navigation sidebar'
                  : 'Collapse navigation sidebar'
              }
              aria-controls='leftNav'
              aria-expanded={!isCollapsed}
            />
          </>
        )}
      </div>
    </NavSidebarContext.Provider>
  )
}

export default Navigator
