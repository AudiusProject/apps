import { useEffect, useRef } from 'react'

import { Flex, FlexProps } from '@audius/harmony'

type TabBodyProps = FlexProps & {
  onHeightChange?: (height: number) => void
}

export const TabBody = ({
  children,
  onHeightChange,
  ...flexProps
}: TabBodyProps) => {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current && onHeightChange) {
      const resizeObserver = new ResizeObserver((entries) => {
        const height = entries[0]?.contentRect.height
        if (height) {
          onHeightChange(height)
        }
      })

      resizeObserver.observe(contentRef.current)
      return () => resizeObserver.disconnect()
    }
  }, [onHeightChange])

  return (
    <Flex column w='100%' ref={contentRef} {...flexProps}>
      {children}
    </Flex>
  )
}
