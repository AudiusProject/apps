import type { PropsWithChildren } from 'react'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'

import { type ID } from '@audius/common/models'
import type { BottomSheetModal } from '@gorhom/bottom-sheet'

import { useDrawer } from 'app/hooks/useDrawer'

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
  const sheetDismissedRef = useRef(false)

  const open = useCallback((props: CommentDrawerData) => {
    setDrawerData(props)

    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    // Closes the comment drawer only. The now-playing drawer should stay
    // open here. Navigation flows that need both drawers closed call
    // `closeAndExitNowPlaying` instead.
    setIsOpen(false)
  }, [])

  // The sheet dismissed itself (swipe-down, backdrop tap, or after an X
  // button close finished). Since @gorhom/bottom-sheet 5.2.11, calling
  // `dismiss()` on a modal that already unmounted leaves it stuck in its
  // DISMISSING status, and the next `present()` then never renders. Record
  // that the sheet is already gone so the effect below skips `dismiss()`.
  const handleSheetDismissed = useCallback(() => {
    sheetDismissedRef.current = true
    setIsOpen(false)
  }, [])

  const closeAndExitNowPlaying = useCallback(() => {
    setIsOpen(false)
    if (isNowPlayingDrawerOpen) {
      closeNowPlayingDrawer()
    }
  }, [closeNowPlayingDrawer, isNowPlayingDrawerOpen])

  useEffect(() => {
    if (isOpen) {
      sheetDismissedRef.current = false
      bottomSheetModalRef.current?.present()
    } else if (!sheetDismissedRef.current) {
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
          onSheetDismissed={handleSheetDismissed}
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
