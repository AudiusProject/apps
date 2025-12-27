import { useCallback } from 'react'

import type {
  ScrollEventHandlerCallbackType,
  ScrollEventsHandlersHookType
} from '@gorhom/bottom-sheet'
import {
  useBottomSheetInternal,
  ANIMATION_STATUS,
  SHEET_STATE,
  SCROLLABLE_STATUS
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
    animatedScrollableStatus,
    animatedAnimationState,
    animatedDetentsState,
    animatedPosition
  } = useBottomSheetInternal()

  // #region callbacks
  const handleOnScroll: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
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

        const { detents } = animatedDetentsState.get()
        const atSnapPoint =
          detents !== undefined &&
          detents.some((v) => animatedPosition.value === v)

        /**
         * NOTE: this is the change to the default hook.
         * If the drawer is not at a a snap point or the scrollable is scrolled upwards,
         * lock the scrolling
         */
        if (!atSnapPoint || y < 0) {
          const lockPosition = 0

          // @ts-ignore
          scrollTo(scrollableRef, 0, lockPosition, false)
          scrollableContentOffsetY.value = lockPosition
          animatedScrollableStatus.value = SCROLLABLE_STATUS.LOCKED
        } else {
          animatedScrollableStatus.value = SCROLLABLE_STATUS.UNLOCKED
        }
      },
      [
        scrollableRef,
        scrollableContentOffsetY,
        animatedScrollableStatus,
        animatedSheetState,
        animatedPosition,
        animatedDetentsState
      ]
    )
  const handleOnBeginDrag: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        scrollableContentOffsetY.value = y
        context.initialContentOffsetY = y
        animatedScrollableState.set((state) => ({
          ...state,
          contentOffsetY: y
        }))

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
      [scrollableContentOffsetY, animatedSheetState, animatedScrollableState]
    )
  const handleOnEndDrag: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        const { detents } = animatedDetentsState.get()
        const atSnapPoint =
          detents !== undefined &&
          detents.some((v) => animatedPosition.value === v)

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
        if (animatedAnimationState.get().status !== ANIMATION_STATUS.RUNNING) {
          scrollableContentOffsetY.value = y
          animatedScrollableState.set((state) => ({
            ...state,
            contentOffsetY: y
          }))
        }
      },
      [
        scrollableRef,
        scrollableContentOffsetY,
        animatedAnimationState,
        animatedScrollableState,
        animatedDetentsState,
        animatedPosition
      ]
    )
  const handleOnMomentumEnd: ScrollEventHandlerCallbackType<ScrollEventContextType> =
    useCallback(
      ({ contentOffset: { y } }, context) => {
        'worklet'
        const { detents } = animatedDetentsState.get()
        const atSnapPoint =
          detents !== undefined &&
          detents.some((v) => animatedPosition.value === v)

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
        if (animatedAnimationState.get().status !== ANIMATION_STATUS.RUNNING) {
          scrollableContentOffsetY.value = y
          animatedScrollableState.set((state) => ({
            ...state,
            contentOffsetY: y
          }))
        }
      },
      [
        scrollableContentOffsetY,
        scrollableRef,
        animatedAnimationState,
        animatedScrollableState,
        animatedDetentsState,
        animatedPosition
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
