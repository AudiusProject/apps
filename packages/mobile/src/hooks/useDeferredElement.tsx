import { useState, useCallback } from 'react'

import { InView } from 'react-native-intersection-observer'

export const useDeferredElement = () => {
  const [inView, setInView] = useState(false)

  const InViewWrapper = useCallback(
    ({ children }: { children: React.ReactNode }) => {
      return (
        <InView triggerOnce onChange={setInView}>
          {children}
        </InView>
      )
    },
    [setInView]
  )

  return {
    inView,
    InViewWrapper
  }
}
