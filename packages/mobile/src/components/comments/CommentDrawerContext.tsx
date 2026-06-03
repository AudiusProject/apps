import type { PropsWithChildren } from 'react'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { Name, type ID } from '@audius/common/models'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'

import { useDrawer } from 'app/hooks/useDrawer'
import { make, track } from 'app/services/analytics'

import type { CommentDrawerData } from './CommentDrawer'
import { CommentDrawer } from './CommentDrawer'

interface CommentDrawerContextState {
  isOpen: boolean
  open: (data: CommentDrawerData) => void
  /**
   * Close the comment drawer only. Use this for dismissal flows where the
   * user is staying on the now-playing screen (swipe-down on the bottom
   * sheet, X button, programmatic dismiss).
   */
  close: (trackId: ID) => void
  /**
   * Close the comment drawer AND any open now-playing drawer behind it.
   * Use this for in-drawer navigation actions (clicking a user link,
   * mention, etc.) so the destination screen is actually visible once
   * the navigation push lands.
   */
  closeAndExitNowPlaying: (trackId: ID) => void
}

const CommentDrawerContext = createContext<
  CommentDrawerContextState | undefined
>(undefined)

/**
 * Provider resposible for managing the state of the comment drawer
 */
export const CommentDrawerProvider = (props: PropsWithChildren) => {
  const { children } = props
  const [isOpen, setIsOpen] = useState(false)
  const { onClose: closeNowPlayingDrawer, isOpen: isNowPlayingDrawerOpen } =
    useDrawer('NowPlaying')
  const [drawerData, setDrawerData] = useState<CommentDrawerData>()
  const bottomSheetModalRef = useRef<BottomSheetModal>(null)

  const open = useCallback((props: CommentDrawerData) => {
    setDrawerData(props)

    setIsOpen(true)
    track(
      make({
        eventName: Name.COMMENTS_OPEN_COMMENT_DRAWER,
        trackId: props.entityId
      })
    )
  }, [])

  const close = useCallback((trackId: ID) => {
    // Closes the comment drawer only. The now-playing drawer should stay
    // open here — the BottomSheetModal's onDismiss callback (swipe-down,
    // backdrop tap, X button) routes through this path and historically
    // also closed the now-playing drawer underneath, which is the bug.
    // Navigation flows that need both drawers closed call
    // `closeAndExitNowPlaying` instead.
    setIsOpen(false)
    track(
      make({
        eventName: Name.COMMENTS_CLOSE_COMMENT_DRAWER,
        trackId
      })
    )
  }, [])

  const closeAndExitNowPlaying = useCallback(
    (trackId: ID) => {
      setIsOpen(false)
      if (isNowPlayingDrawerOpen) {
        closeNowPlayingDrawer()
      }
      track(
        make({
          eventName: Name.COMMENTS_CLOSE_COMMENT_DRAWER,
          trackId
        })
      )
    },
    [closeNowPlayingDrawer, isNowPlayingDrawerOpen]
  )

  useEffect(() => {
    if (isOpen) {
      bottomSheetModalRef.current?.present()
    } else {
      bottomSheetModalRef.current?.dismiss()
    }
  }, [isOpen])

  return (
    <CommentDrawerContext.Provider
      value={{ isOpen, open, close, closeAndExitNowPlaying }}
    >
      {children}
      {drawerData ? (
        <CommentDrawer
          {...drawerData}
          bottomSheetModalRef={bottomSheetModalRef}
          handleClose={close}
        />
      ) : null}
    </CommentDrawerContext.Provider>
  )
}

export const useCommentDrawer = () => {
  const context = useContext(CommentDrawerContext)
  if (context === undefined) {
    throw new Error(
      'useCommentDrawer must be used within a CommentDrawerProvider'
    )
  }
  return context
}
