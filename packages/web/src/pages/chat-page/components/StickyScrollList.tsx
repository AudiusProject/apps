import {
  ComponentPropsWithoutRef,
  forwardRef,
  useLayoutEffect,
  useRef
} from 'react'

import { mergeRefs } from 'react-merge-refs'

type StickyScrollListProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * When the reset key changes, the component is scrolled to the bottom.
   */
  resetKey: any
  /**
   * Used to communicate when scroll height changes will happen.
   */
  updateKey: any
  /**
   * Whether the scroll bar should stick to the top.
   * When true, if items are added to the top of the scroll area
   * while the user is scrolled all the way to the top,
   * the scroll area will jump to the top-most item
   */
  stickToTop?: boolean
  /**
   * Whether the scrollbar should stick to the bottom.
   * When true, if items are added to the bottom of the scroll area
   * while the user is scrolled all the way to the bottom,
   * the scroll area will jump to the bottom most item
   */
  stickToBottom?: boolean
  /**
   * Threshold for how close to the bottom the user must be before we stick to the bottom.
   */
  scrollBottomThreshold?: number
}

type MeasuresBefore = {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}

/**
 * A self-rolled infinite loader helper.
 *
 * Allows for items to be added to the start or end of a list
 * without disrupting the user's scroll position
 */
export const StickyScrollList = forwardRef<
  HTMLDivElement,
  StickyScrollListProps
>((props, forwardedRef) => {
  const {
    updateKey,
    resetKey,
    stickToTop = false,
    stickToBottom = false,
    scrollBottomThreshold = 0,
    ...other
  } = props
  const ref = useRef<HTMLDivElement>(null)

  const oldResetKey = useRef<any | undefined>(undefined)
  const oldUpdateKey = useRef<any | undefined>(undefined)
  const measuresBefore = useRef<MeasuresBefore>({
    scrollHeight: 0,
    scrollTop: 0,
    clientHeight: 0
  })

  const didUpdate = updateKey !== oldUpdateKey.current
  if (didUpdate) {
    if (ref.current) {
      // Before render, save the height and scroll position
      measuresBefore.current = {
        scrollHeight: ref.current.scrollHeight,
        scrollTop: ref.current.scrollTop,
        clientHeight: ref.current.clientHeight
      }
    }
  }

  useLayoutEffect(() => {
    if (ref.current) {
      if (resetKey !== oldResetKey.current) {
        oldResetKey.current = resetKey

        // If re-initting something that's already loaded
        // this will make us start from the bottom again after render
        ref.current.scrollTo({ top: ref.current.scrollHeight })
      } else if (didUpdate) {
        oldUpdateKey.current = updateKey
        const wasAtBottomBeforeRender =
          measuresBefore.current.clientHeight +
            measuresBefore.current.scrollTop >=
          measuresBefore.current.scrollHeight - scrollBottomThreshold
        const wasAtTopBeforeRender = measuresBefore.current.scrollTop === 0
        if (wasAtBottomBeforeRender && stickToBottom) {
          // Stick to the bottom
          ref.current.scrollTo({ top: ref.current.scrollHeight })
        } else if (wasAtTopBeforeRender && !stickToTop) {
          // Don't get stuck to the top
          ref.current.scrollTo({
            top:
              ref.current.scrollHeight -
              measuresBefore.current.scrollHeight +
              measuresBefore.current.scrollTop
          })
        }
      }
    }
  }, [
    ref,
    measuresBefore,
    resetKey,
    didUpdate,
    updateKey,
    stickToTop,
    stickToBottom,
    scrollBottomThreshold
  ])

  return (
    <div ref={mergeRefs([ref, forwardedRef])} {...other}>
      {props.children}
    </div>
  )
})
