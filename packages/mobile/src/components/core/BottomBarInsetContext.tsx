import { createContext, useContext } from 'react'

/** Space occupied by the floating tab bar and mini-player. Modal stacks default to zero. */
export const BottomBarInsetContext = createContext(0)

export const useBottomBarInset = () => useContext(BottomBarInsetContext)
