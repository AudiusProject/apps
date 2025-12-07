import React, {
  useState,
  useEffect,
  useRef,
  Children,
  cloneElement,
  isValidElement,
  useMemo
} from 'react'

import { ScrollView } from 'react-native'

import { Flex, type SpacingOptions } from '@audius/harmony-native'

interface ProgressiveScrollViewProps {
  children: React.ReactNode
  initialLoadCount?: number
  loadDelay?: number
  onUserInteraction?: () => void
  gap?: SpacingOptions
}

export const ProgressiveScrollView = ({
  children,
  initialLoadCount = 0,
  loadDelay = 100,
  gap,
  onUserInteraction
}: ProgressiveScrollViewProps) => {
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set())
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)
  const hasStartedLoadingRef = useRef(false)

  const childrenArray = useMemo(() => Children.toArray(children), [children])

  // Load sections progressively
  useEffect(() => {
    if (hasStartedLoadingRef.current) return

    hasStartedLoadingRef.current = true

    const loadSections = () => {
      childrenArray.forEach((_, index) => {
        if (index < initialLoadCount) {
          // Load initial sections immediately
          setLoadedIndices((prev) => new Set([...prev, index]))
        } else {
          // Load remaining sections with delay
          setTimeout(
            () => {
              setLoadedIndices((prev) => new Set([...prev, index]))
            },
            (index - initialLoadCount + 1) * loadDelay
          )
        }
      })
    }

    loadSections()
  }, [childrenArray, initialLoadCount, loadDelay])

  // Accelerate loading if user starts interacting
  const handleScroll = () => {
    if (!isUserInteracting) {
      setIsUserInteracting(true)
      onUserInteraction?.()

      // Load all remaining sections immediately
      const allIndices = new Set(childrenArray.map((_, index) => index))
      setLoadedIndices(allIndices)
    }
  }

  const renderChild = (child: React.ReactElement, index: number) => {
    const isLoaded = loadedIndices.has(index)
    // Clone the child and pass isLoading prop
    return cloneElement(child, {
      key: index,
      // @ts-ignore
      isLoading: !isLoaded
    })
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <Flex gap={gap} direction='column' ph='l' pt='s' pb='unit20' mb='unit20'>
        {childrenArray.map((child, index) => {
          if (isValidElement(child)) {
            return renderChild(child, index)
          }
          return child
        })}
      </Flex>
    </ScrollView>
  )
}
