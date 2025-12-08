import { useCallback } from 'react'

import type {
  ScrollEventHandlerCallbackType,
  ScrollEventsHandlersHookType
} from '@gorhom/bottom-sheet'
import {
  useBottomSheetInternal,
  ANIMATION_STATE,
  SHEET_STATE,
  SCROLLABLE_STATE
} from '@gorhom/bottom-sheet'
import { scrollTo } from 'react-native-reanimated'

export type ScrollEventContextType = {
  initialContentOffsetY: number
  shouldLockInitialPosition: boolean
}

export const useScrollEventsHandlers: ScrollEventsHandlersHookType = (
  scrollableRef,
  scrollableContentOffsetY
) => {
  // hooks
  const {
    animatedSheetState,
    animatedScrollableState,
    animatedAnimationState,
    animatedSnapPoints,
    animatedPosition,
    animatedScrollableContentOffsetY: rootScrollableContentOffsetY
  } = useBottomSheetInternal()

  // #region callbacks
  const handleOnScroll: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        rootScrollableContentOffsetY.value = y
        /**
         * if sheet position is extended or fill parent, then we reset
         * `shouldLockInitialPosition` value to false.
         */
        if (
          animatedSheetState.value === SHEET_STATE.EXTENDED ||
          animatedSheetState.value === SHEET_STATE.FILL_PARENT
        ) {
          context.shouldLockInitialPosition = false
        }

        const atSnapPoint = animatedSnapPoints.value.some(
          (v) => animatedPosition.value === v
        )

        /**
         * NOTE: this is the change to the default hook.
         * If the drawer is not at a a snap point or the scrollable is scrolled upwards,
         * lock the scrolling
         */

        animatedScrollableState.value =
          !atSnapPoint || y < 0
            ? SCROLLABLE_STATE.LOCKED
            : SCROLLABLE_STATE.UNLOCKED

        if (animatedScrollableState.value === SCROLLABLE_STATE.LOCKED) {
          const lockPosition = 0

          // @ts-ignore
          scrollTo(scrollableRef, 0, lockPosition, false)
          scrollableContentOffsetY.value = lockPosition
        }
      },
      [
        scrollableRef,
        scrollableContentOffsetY,
        animatedScrollableState,
        animatedSheetState,
        animatedPosition,
        animatedSnapPoints
      ]
    )
  const handleOnBeginDrag: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        scrollableContentOffsetY.value = y
        rootScrollableContentOffsetY.value = y
        context.initialContentOffsetY = y

        /**
         * if sheet position not extended or fill parent and the scrollable position
         * not at the top, then we should lock the initial scrollable position.
         */
        if (
          animatedSheetState.value !== SHEET_STATE.EXTENDED &&
          animatedSheetState.value !== SHEET_STATE.FILL_PARENT &&
          y > 0
        ) {
          context.shouldLockInitialPosition = true
        } else {
          context.shouldLockInitialPosition = false
        }
      },
      [
        scrollableContentOffsetY,
        animatedSheetState,
        rootScrollableContentOffsetY
      ]
    )
  const handleOnEndDrag: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        const atSnapPoint = animatedSnapPoints.value.some(
          (v) => animatedPosition.value === v
        )

        /**
         * NOTE: this is the change to the default hook.
         * If the drawer is not at a a snap point or the scrollable is scrolled upwards,
         * lock the scrolling
         */
        if (!atSnapPoint || y < 0) {
          const lockPosition = context.shouldLockInitialPosition
            ? (context.initialContentOffsetY ?? 0)
            : 0
          // @ts-ignore
          scrollTo(scrollableRef, 0, lockPosition, false)
          scrollableContentOffsetY.value = lockPosition
          return
        }
        if (animatedAnimationState.value !== ANIMATION_STATE.RUNNING) {
          scrollableContentOffsetY.value = y
          rootScrollableContentOffsetY.value = y
        }
      },
      [
        scrollableRef,
        scrollableContentOffsetY,
        animatedAnimationState,
        animatedScrollableState,
        rootScrollableContentOffsetY
      ]
    )
  const handleOnMomentumEnd: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        const atSnapPoint = animatedSnapPoints.value.some(
          (v) => animatedPosition.value === v
        )

        /**
         * NOTE: this is the change to the default hook.
         * If the drawer is not at a a snap point or the scrollable is scrolled upwards,
         * lock the scrolling
         */
        if (y < 0 || !atSnapPoint) {
          const lockPosition = context.shouldLockInitialPosition
            ? (context.initialContentOffsetY ?? 0)
            : 0
          // @ts-ignore
          scrollTo(scrollableRef, 0, lockPosition, false)
          scrollableContentOffsetY.value = 0
          return
        }
        if (animatedAnimationState.value !== ANIMATION_STATE.RUNNING) {
          scrollableContentOffsetY.value = y
          rootScrollableContentOffsetY.value = y
        }
      },
      [
        scrollableContentOffsetY,
        scrollableRef,
        animatedAnimationState,
        animatedScrollableState,
        rootScrollableContentOffsetY
      ]
    )
  // #endregion

  return {
    handleOnScroll,
    handleOnBeginDrag,
    handleOnEndDrag,
    handleOnMomentumEnd
  }
}
