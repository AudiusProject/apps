import { createContext, memo, useState } from 'react'

import { useIsMobile } from 'hooks/useIsMobile'

export enum SlideDirection {
  FROM_LEFT = 'left',
  FROM_RIGHT = 'right'
}

type RouterContextProps = {
  stackReset: boolean
  setStackReset: (updated: boolean) => void
  slideDirection: SlideDirection
  setSlideDirection: (updated: SlideDirection) => void
}

export const RouterContext = createContext<RouterContextProps>({
  stackReset: false,
  setStackReset: () => {},
  slideDirection: SlideDirection.FROM_LEFT,
  setSlideDirection: () => {}
})

export const RouterContextProvider = memo(
  (props: { children: JSX.Element }) => {
    const [stackReset, setStackReset] = useState(false)
    const [slideDirection, setSlideDirection] = useState(
      SlideDirection.FROM_LEFT
    )

    const isMobile = useIsMobile()

    if (isMobile) {
      return (
        <RouterContext.Provider
          value={{
            stackReset,
            setStackReset,
            slideDirection,
            setSlideDirection
          }}
        >
          {props.children}
        </RouterContext.Provider>
      )
    }

    return props.children
  }
)
