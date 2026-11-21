import {
  ReactNode,
  createContext,
  useState,
  memo,
  useRef,
  useContext,
  useEffect,
  useCallback
} from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

type NavContextProps = {
  setLeft: (el: LeftElement) => void
  setCenter: (el: CenterElement) => void
  setRight: (el: RightElement) => void
  leftElement: LeftElement
  centerElement: CenterElement
  rightElement: RightElement
}

export enum LeftPreset {
  BACK = 'BACK',
  CLOSE = 'CLOSE',
  CLOSE_NO_ANIMATION = 'CLOSE_NO_ANIMATION',
  NOTIFICATION = 'NOTIFICATION',
  SETTINGS = 'SETTINGS'
}

export enum CenterPreset {
  LOGO = 'LOGO'
}

export enum RightPreset {
  KEBAB = 'KEBAB'
}

type LeftElement = LeftPreset | ReactNode | null
type CenterElement = CenterPreset | string | null
type RightElement = RightPreset | ReactNode | null

const NavContext = createContext<NavContextProps>({
  setLeft: () => {},
  setCenter: () => {},
  setRight: () => {},
  leftElement: LeftPreset.NOTIFICATION,
  centerElement: CenterPreset.LOGO,
  rightElement: RightPreset.KEBAB
})

const useNavContext = () => {
  const [leftElement, setLeft] = useState<LeftElement>(LeftPreset.NOTIFICATION)
  const [centerElement, setCenter] = useState<CenterElement>(CenterPreset.LOGO)
  const [rightElement, setRight] = useState<RightElement>(RightPreset.KEBAB)
  return {
    leftElement,
    setLeft,
    centerElement,
    setCenter,
    rightElement,
    setRight
  }
}

export const NavProvider = memo((props: { children: JSX.Element }) => {
  const contextValue = useNavContext()
  const isMobile = useIsMobile()
  if (isMobile) {
    return (
      <NavContext.Provider value={contextValue}>
        {props.children}
      </NavContext.Provider>
    )
  }
  return props.children
})

export const useMainPageHeader = () => {
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.NOTIFICATION)
    setCenter(CenterPreset.LOGO)
    setRight(RightPreset.KEBAB)
  }, [setLeft, setCenter, setRight])
}

export const useSubPageHeader = () => {
  const { setLeft, setCenter, setRight } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
    setCenter(CenterPreset.LOGO)
    setRight(RightPreset.KEBAB)
  }, [setLeft, setCenter, setRight])
}

export const useTemporaryNavContext = (
  setters: () => {
    left: LeftElement
    center: CenterElement
    right: RightElement
  }
): (() => void) => {
  const initialContext = useRef<any>(null)
  const {
    setLeft,
    setCenter,
    setRight,
    leftElement,
    centerElement,
    rightElement
  } = useContext(NavContext)!
  useEffect(() => {
    if (!initialContext.current) {
      initialContext.current = {
        leftElement,
        centerElement,
        rightElement
      }
    }
  }, [leftElement, centerElement, rightElement, initialContext])

  useEffect(() => {
    const { left, center, right } = setters()

    setLeft(left)
    setCenter(center)
    setRight(right)

    return () => {
      setLeft(initialContext.current.leftElement)
      setCenter(initialContext.current.centerElement)
      setRight(initialContext.current.rightElement)
    }
  }, [setLeft, setRight, setCenter, setters])

  return useCallback(() => {
    setLeft(initialContext.current.leftElement)
    setCenter(initialContext.current.centerElement)
    setRight(initialContext.current.rightElement)
  }, [setLeft, setRight, setCenter, initialContext])
}

export default NavContext
