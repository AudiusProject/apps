import {
  useEffect,
  useRef,
  forwardRef,
  Ref,
  useCallback,
  useId,
  createContext,
  useContext,
  RefObject
} from 'react'

import { ResizeObserver } from '@juggle/resize-observer'
import cn from 'classnames'
import PerfectScrollbar from 'react-perfect-scrollbar'
import useMeasure from 'react-use-measure'

import styles from './Scrollbar.module.css'
import { ScrollbarProps } from './types'

const ScrollbarContext = createContext<{
  scrollBarRef: RefObject<HTMLElement | null> | null
}>({
  scrollBarRef: null
})

export const useScrollbarRef = () => {
  return useContext(ScrollbarContext).scrollBarRef
}

/**
 * A container with a custom scrollbar, meant to be used for small scrolling areas within a
 * page/view (e.g. a scrolling navigation bar), not the entire page itself.
 * `Scrollbar` uses react-perfect-scrollbar (https://www.npmjs.com/package/react-perfect-scrollbar)
 * under the hood. For advanced use cases, refer to the documentation.
 */
export const Scrollbar = forwardRef(
  (
    { children, className, id, forward, isHidden, ...props }: ScrollbarProps,
    forwardedRef: Ref<PerfectScrollbar>
  ) => {
    // Do not remove:
    // useMeasure ref is required for infinite scrolling to work
    const [ref] = useMeasure({ polyfill: ResizeObserver })
    const containerRef = useRef<HTMLElement | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const reactId = useId()
    const elementId = id || reactId

    useEffect(() => {
      return () => {
        if (timerRef.current !== null) {
          clearTimeout(timerRef.current)
        }
      }
    }, [])

    const hideScrollbar = useCallback(() => {
      const element = document.getElementById(elementId)
      if (element) {
        element.classList.remove('scrollbar--hovered-visible')
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
    }, [elementId, timerRef])

    const showScrollbar = useCallback(() => {
      if (isHidden) return
      const element = document.getElementById(elementId)
      if (element) {
        element.classList.add('scrollbar--hovered-visible')
      }
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        const element = document.getElementById(elementId)
        if (element) {
          element.classList.remove('scrollbar--hovered-visible')
        }
      }, 1400)
    }, [elementId, timerRef, isHidden])

    useEffect(() => {
      if (isHidden) {
        hideScrollbar()
      }
    }, [isHidden, hideScrollbar])

    const content = forward ? (
      children
    ) : (
      <div ref={ref} className={styles.scrollbar}>
        {children}
      </div>
    )

    return (
      <ScrollbarContext.Provider value={{ scrollBarRef: containerRef }}>
        <PerfectScrollbar
          {...props}
          ref={forwardedRef}
          containerRef={(ref) => (containerRef.current = ref)}
          id={elementId}
          className={cn(styles.scrollbar, className)}
          onMouseEnter={showScrollbar}
          onMouseLeave={hideScrollbar}
        >
          {content}
        </PerfectScrollbar>
      </ScrollbarContext.Provider>
    )
  }
)
