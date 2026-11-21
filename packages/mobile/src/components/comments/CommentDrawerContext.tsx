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
  close: (trackId: ID) => void
  closeAndExitNowPlaying: (trackId: ID) => void
}

const CommentDrawerContext = createContext<
  CommentDrawerContextState | undefined
>(undefined)

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
    setIsOpen(false)
  }, [])

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
