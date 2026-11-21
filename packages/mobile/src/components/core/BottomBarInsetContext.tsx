import { createContext, useContext } from 'react'

export const BottomBarInsetContext = createContext(0)
export const SetPlayBarVisibilityContext = createContext<
  (visible: boolean) => void
>(() => {})

export const useBottomBarInset = () => useContext(BottomBarInsetContext)
