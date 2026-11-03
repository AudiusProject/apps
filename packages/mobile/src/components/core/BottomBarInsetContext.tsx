import { createContext, useContext } from 'react'

/** Space occupied by visible app chrome. Full-screen modals default to zero. */
export const BottomBarInsetContext = createContext(0)
export const SetPlayBarVisibilityContext = createContext<
  (visible: boolean) => void
>(() => {})

export const useBottomBarInset = () => useContext(BottomBarInsetContext)
