import { Children, ReactNode, useState } from 'react'

import { Flex } from '@audius/harmony'
import { ResizeObserver } from '@juggle/resize-observer'
import { animated, useTransition } from '@react-spring/web'
import useMeasure from 'react-use-measure'

const defaultTransitions = {
  initial: { opacity: 1, transform: 'translate3d(0%, 0, 0)' },
  enter: { opacity: 1, transform: 'translate3d(0%, 0 ,0)' }
}
const getSwipeTransitions = (direction: 'back' | 'forward') =>
  direction === 'forward'
    ? {
        ...defaultTransitions,
        from: { opacity: 0, transform: 'translate3d(100%, 0, 0)' },
        leave: { opacity: 0, transform: 'translate3d(-100%, 0, 0)' }
      }
    : {
        ...defaultTransitions,
        from: { opacity: 0, transform: 'translate3d(-100%, 0, 0)' },
        leave: { opacity: 0, transform: 'translate3d(100%, 0, 0)' }
      }

export const SlidingPages = ({
  currentPage,
  children,
  width = '100%',
  height = 'auto'
}: {
  width?: string
  height?: string
  currentPage: number
  children: Iterable<ReactNode>
}) => {
  const [lastPage, setLastPage] = useState(0)
  const [transitions, setTransitions] = useState<
    ReturnType<typeof getSwipeTransitions>
  >(getSwipeTransitions('forward'))

  if (lastPage !== currentPage) {
    setTransitions(
      getSwipeTransitions(currentPage > lastPage ? 'forward' : 'back')
    )
    setLastPage(currentPage)
  }

  const transition = useTransition(currentPage, transitions)

  const [ref, { height: computedHeight, width: computedWidth }] = useMeasure({
    offsetSize: true,
    polyfill: ResizeObserver
  })

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      w={width === 'auto' ? `${computedWidth}px` : width}
      h={height === 'auto' ? `${computedHeight}px` : height}
      css={{ position: 'relative', overflow: 'hidden' }}
    >
      {transition((style, item) => (
        <animated.div
          ref={ref}
          style={{
            ...style,
            position: 'absolute',
            top: 0,
            left: 0,
            right: width === 'auto' ? undefined : 0
          }}
        >
          {Children.toArray(children)[item]}
        </animated.div>
      ))}
    </Flex>
  )
}
