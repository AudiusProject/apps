import { createContext, useContext } from 'react'

type TilePressBlockContextValue = (() => void) | undefined

export const TilePressBlockContext =
  createContext<TilePressBlockContextValue>(undefined)

export const useTilePressBlock = () => useContext(TilePressBlockContext)
