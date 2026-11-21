import {
  ComponentPropsWithoutRef,
  forwardRef,
  useLayoutEffect,
  useRef
} from 'react'

import { mergeRefs } from 'react-merge-refs'

type StickyScrollListProps = ComponentPropsWithoutRef<'div'> & {
  resetKey: any
  updateKey: any
  stickToTop?: boolean
  stickToBottom?: boolean
  scrollBottomThreshold?: number
}

type MeasuresBefore = {
  scrollHeight: number
  scrollTop: number
  clientHeight: number
}

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

        ref.current.scrollTo({ top: ref.current.scrollHeight })
      } else if (didUpdate) {
        oldUpdateKey.current = updateKey
        const wasAtBottomBeforeRender =
          measuresBefore.current.clientHeight +
            measuresBefore.current.scrollTop >=
          measuresBefore.current.scrollHeight - scrollBottomThreshold
        const wasAtTopBeforeRender = measuresBefore.current.scrollTop === 0
        if (wasAtBottomBeforeRender && stickToBottom) {
          ref.current.scrollTo({ top: ref.current.scrollHeight })
        } else if (wasAtTopBeforeRender && !stickToTop) {
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
