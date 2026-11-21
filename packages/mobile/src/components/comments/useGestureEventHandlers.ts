import { useCallback } from 'react'

import type {
  GestureEventHandlerCallbackType,
  GestureEventsHandlersHookType
} from '@gorhom/bottom-sheet'
import {
  ANIMATION_SOURCE,
  GESTURE_SOURCE,
  KEYBOARD_STATUS,
  SCROLLABLE_TYPE,
  useBottomSheetInternal
} from '@gorhom/bottom-sheet'
import { Keyboard, Platform } from 'react-native'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

export const clamp = (
  value: number,
  lowerBound: number,
  upperBound: number
) => {
  'worklet'
  return Math.min(Math.max(lowerBound, value), upperBound)
}

export const snapPoint = (
  value: number,
  velocity: number,
  points: ReadonlyArray<number>
): number => {
  'worklet'
  const point = value + 0.2 * velocity
  const deltas = points.map((p) => Math.abs(point - p))
  const minDelta = Math.min.apply(null, deltas)
  return points.filter((p) => Math.abs(point - p) === minDelta)[0]
}

type GestureEventContextType = {
  initialPosition: number
  initialKeyboardStatus: KEYBOARD_STATUS
  isScrollablePositionLocked: boolean
}

const INITIAL_CONTEXT: GestureEventContextType = {
  initialPosition: 0,
  initialKeyboardStatus: KEYBOARD_STATUS.UNDETERMINED,
  isScrollablePositionLocked: false
}

const dismissKeyboard = Keyboard.dismiss

export const useGestureEventsHandlers: GestureEventsHandlersHookType = () => {
  // #region variables
  const {
    animatedPosition,
    animatedDetentsState,
    animatedKeyboardState,
    animatedScrollableState,
    animatedLayoutState,
    enableOverDrag,
    enablePanDownToClose,
    overDragResistanceFactor,
    isInTemporaryPosition,
    animateToPosition,
    stopAnimation
  } = useBottomSheetInternal()

  const context = useSharedValue<GestureEventContextType>({
    ...INITIAL_CONTEXT
  })
  // #endregion

  // #region gesture methods
  const handleOnStart: GestureEventHandlerCallbackType = useCallback(
    function handleOnStart(__, _) {
      'worklet'
      stopAnimation()

      const initialKeyboardStatus = animatedKeyboardState.get().status
      context.value = {
        ...context.value,
        initialPosition: animatedPosition.value,
        initialKeyboardStatus
      }

      if (animatedScrollableState.get().contentOffsetY > 0) {
        context.value = {
          ...context.value,
          isScrollablePositionLocked: true
        }
      }
    },
    [
      stopAnimation,
      context,
      animatedPosition,
      animatedKeyboardState,
      animatedScrollableState
    ]
  )

  const handleOnChange: GestureEventHandlerCallbackType = useCallback(
    function handleOnChange(source, { translationY }) {
      'worklet'
      const { highestDetentPosition, detents } = animatedDetentsState.get()
      if (
        highestDetentPosition === undefined ||
        detents === undefined ||
        detents.length === 0
      ) {
        return
      }

      let highestSnapPoint = highestDetentPosition

      if (
        isInTemporaryPosition.value &&
        context.value.initialKeyboardStatus === KEYBOARD_STATUS.SHOWN
      ) {
        highestSnapPoint = context.value.initialPosition
      }

      if (
        isInTemporaryPosition.value &&
        context.value.initialPosition < highestSnapPoint
      ) {
        highestSnapPoint = context.value.initialPosition
      }

      const { containerHeight } = animatedLayoutState.get()
      const lowestSnapPoint = enablePanDownToClose
        ? containerHeight
        : detents[0]

      const atSnapPoint = detents.some((v) => animatedPosition.value === v)

      if (
        source === GESTURE_SOURCE.CONTENT &&
        animatedScrollableState.get().refreshable &&
        animatedPosition.value === highestSnapPoint
      ) {
        return
      }

      if (
        source === GESTURE_SOURCE.CONTENT &&
        atSnapPoint &&
        animatedScrollableState.get().contentOffsetY !== 0
      ) {
        return
      }

      const negativeScrollableContentOffset =
        (context.value.initialPosition === highestSnapPoint &&
          source === GESTURE_SOURCE.CONTENT) ||
        !context.value.isScrollablePositionLocked
          ? animatedScrollableState.get().contentOffsetY * -1
          : 0

      const draggedPosition = context.value.initialPosition + translationY

      const accumulatedDraggedPosition =
        draggedPosition + negativeScrollableContentOffset

      const clampedPosition = clamp(
        accumulatedDraggedPosition,
        highestSnapPoint,
        lowestSnapPoint
      )

      if (
        context.value.isScrollablePositionLocked &&
        source === GESTURE_SOURCE.CONTENT &&
        animatedPosition.value === highestSnapPoint
      ) {
        context.value = {
          ...context.value,
          isScrollablePositionLocked: false
        }
      }

      if (enableOverDrag) {
        if (
          (source === GESTURE_SOURCE.HANDLE ||
            animatedScrollableState.get().type === SCROLLABLE_TYPE.VIEW) &&
          draggedPosition < highestSnapPoint
        ) {
          const resistedPosition =
            highestSnapPoint -
            Math.sqrt(1 + (highestSnapPoint - draggedPosition)) *
              overDragResistanceFactor
          animatedPosition.value = resistedPosition
          return
        }

        if (
          source === GESTURE_SOURCE.HANDLE &&
          draggedPosition > lowestSnapPoint
        ) {
          const resistedPosition =
            lowestSnapPoint +
            Math.sqrt(1 + (draggedPosition - lowestSnapPoint)) *
              overDragResistanceFactor
          animatedPosition.value = resistedPosition
          return
        }

        if (
          source === GESTURE_SOURCE.CONTENT &&
          draggedPosition + negativeScrollableContentOffset > lowestSnapPoint
        ) {
          const resistedPosition =
            lowestSnapPoint +
            Math.sqrt(
              1 +
                (draggedPosition +
                  negativeScrollableContentOffset -
                  lowestSnapPoint)
            ) *
              overDragResistanceFactor
          animatedPosition.value = resistedPosition
          return
        }
      }

      animatedPosition.value = clampedPosition
    },
    [
      enableOverDrag,
      enablePanDownToClose,
      overDragResistanceFactor,
      isInTemporaryPosition,
      animatedScrollableState,
      animatedDetentsState,
      animatedLayoutState,
      animatedPosition,
      context
    ]
  )
  const handleOnEnd: GestureEventHandlerCallbackType = useCallback(
    function handleOnEnd(source, { translationY, absoluteY, velocityY }) {
      'worklet'
      const { highestDetentPosition, detents, closedDetentPosition } =
        animatedDetentsState.get()
      if (
        highestDetentPosition === undefined ||
        detents === undefined ||
        detents.length === 0 ||
        closedDetentPosition === undefined
      ) {
        return
      }

      const highestSnapPoint = highestDetentPosition
      const isSheetAtHighestSnapPoint =
        animatedPosition.value === highestSnapPoint
      const {
        refreshable: scrollableIsRefreshable,
        contentOffsetY: scrollableContentOffsetY,
        type: scrollableType
      } = animatedScrollableState.get()

      if (
        source === GESTURE_SOURCE.CONTENT &&
        scrollableIsRefreshable &&
        isSheetAtHighestSnapPoint
      ) {
        return
      }

      const atSnapPoint = detents.some((v) => animatedPosition.value === v)

      if (
        source === GESTURE_SOURCE.CONTENT &&
        atSnapPoint &&
        scrollableContentOffsetY > 0
      ) {
        return
      }

      if (
        isInTemporaryPosition.value &&
        context.value.initialPosition >= animatedPosition.value
      ) {
        if (context.value.initialPosition > animatedPosition.value) {
          animateToPosition(
            context.value.initialPosition,
            ANIMATION_SOURCE.GESTURE,
            velocityY / 2
          )
        }
        return
      }

      const isScrollable =
        scrollableType !== SCROLLABLE_TYPE.UNDETERMINED &&
        scrollableType !== SCROLLABLE_TYPE.VIEW

      if (
        context.value.initialKeyboardStatus === KEYBOARD_STATUS.SHOWN &&
        animatedPosition.value > context.value.initialPosition
      ) {
        const { window } = animatedLayoutState.get()
        if (
          !(
            Platform.OS === 'ios' &&
            isScrollable &&
            absoluteY >
              window.height - animatedKeyboardState.get().heightWithinContainer
          )
        ) {
          runOnJS(dismissKeyboard)()
        }
      }

      if (isInTemporaryPosition.value) {
        isInTemporaryPosition.value = false
      }

      const snapPoints = detents.slice()
      if (enablePanDownToClose) {
        snapPoints.unshift(closedDetentPosition)
      }

      const destinationPoint = snapPoint(
        translationY + context.value.initialPosition,
        velocityY,
        snapPoints
      )

      if (destinationPoint === animatedPosition.value) {
        return
      }

      const wasGestureHandledByScrollView =
        source === GESTURE_SOURCE.CONTENT && scrollableContentOffsetY > 0
      if (wasGestureHandledByScrollView && isSheetAtHighestSnapPoint) {
        return
      }

      animateToPosition(
        destinationPoint,
        ANIMATION_SOURCE.GESTURE,
        velocityY / 2
      )
    },
    [
      enablePanDownToClose,
      isInTemporaryPosition,
      animatedScrollableState,
      animatedDetentsState,
      animatedKeyboardState,
      animatedLayoutState,
      animatedPosition,
      animateToPosition,
      context
    ]
  )

  const handleOnFinalize: GestureEventHandlerCallbackType = useCallback(
    function handleOnFinalize() {
      'worklet'
      context.value = { ...INITIAL_CONTEXT }
    },
    [context]
  )
  // #endregion

  return {
    handleOnStart,
    handleOnChange,
    handleOnEnd,
    handleOnFinalize
  }
}
