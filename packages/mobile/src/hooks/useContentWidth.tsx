import { createContext, useContext } from 'react'

import { useWindowDimensions } from 'react-native'

export const ContentWidthContext = createContext<number | null>(null)

export const useContentWidth = () => {
  const { width } = useWindowDimensions()
  const contentWidth = useContext(ContentWidthContext)
  return contentWidth ?? width
}
