import { useCallback, useContext, useRef, useState } from 'react'

import type { ReactionTypes } from '@audius/common/api'
import { reactionOrder } from '@audius/common/api'
import type { Nullable } from '@audius/common/utils'
import type {
  ViewStyle,
  PanResponderGestureState,
  StyleProp
} from 'react-native'
import { View, PanResponder } from 'react-native'

import { AppDrawerContext } from 'app/screens/app-drawer-screen'
import { makeStyles } from 'app/styles'

import type { OnMeasure } from './Reaction'
import { reactionMap } from './reactions'

const useStyles = makeStyles(() => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center'
  }
}))

type PositionEntries = [ReactionTypes, { x: number; width: number }][]

type ReactionListProps = {
  selectedReaction: Nullable<ReactionTypes>
  onChange: (reaction: Nullable<ReactionTypes>) => void
  isVisible: boolean
  scale?: number
  style?: {
    emoji?: StyleProp<ViewStyle>
  }
}

const initialPositions = {
  '🔥': { x: 0, width: 0 },
  '😍': { x: 0, width: 0 },
  '🥳': { x: 0, width: 0 },
  '🤯': { x: 0, width: 0 }
}

type Positions = { [k in ReactionTypes]: { x: number; width: number } }

export const ReactionList = (props: ReactionListProps) => {
  const {
    selectedReaction,
    onChange,
    isVisible,
    scale,
    style: styleProp
  } = props
  const styles = useStyles()
  const interactingReactionRef = useRef<ReactionTypes | null>(null)
  const { setGesturesDisabled } = useContext(AppDrawerContext)
  const [interacting, setInteracting] = useState<ReactionTypes | null>(null)
  const positions = useRef<Positions>(initialPositions)
  const xOffset = useRef(0)
  const reactionContainerRef = useRef<View | null>(null)

  const handleGesture = useCallback(
    (_, gestureState: PanResponderGestureState) => {
      const { x0, moveX } = gestureState

      const positionEntries = Object.entries(
        positions.current
      ) as PositionEntries

      const currentReaction = positionEntries.find(([, { x, width }]) => {
        const currentPosition = (moveX || x0) - xOffset.current
        return currentPosition > x && currentPosition <= x + width
      })

      if (currentReaction) {
        const [reactionType] = currentReaction
        interactingReactionRef.current = reactionType
        setInteracting(reactionType as ReactionTypes)
      } else {
        interactingReactionRef.current = null
        setInteracting(null)
      }
    },
    []
  )

  const handlePanResponderRelease = useCallback(() => {
    onChange(interactingReactionRef.current)
    interactingReactionRef.current = null
    setInteracting(null)
    setGesturesDisabled?.(false)
  }, [onChange, setGesturesDisabled])

  const panResponder = useRef(
    PanResponder.create({
      onPanResponderGrant: (e, gestureState) => {
        setGesturesDisabled?.(true)
        handleGesture(e, gestureState)
      },
      onPanResponderMove: handleGesture,
      onPanResponderRelease: handlePanResponderRelease,
      onPanResponderTerminate: handlePanResponderRelease,
      onMoveShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onStartShouldSetPanResponder: () => true
    })
  )

  const handleLayout = useCallback(() => {
    reactionContainerRef.current?.measure(
      (x, y, width, height, pageX, pageY) => {
        xOffset.current = pageX
      }
    )
  }, [])

  const handleMeasure: OnMeasure = useCallback((config) => {
    const { x, width, reactionType } = config
    positions.current = { ...positions.current, [reactionType]: { x, width } }
  }, [])

  return (
    <View onLayout={handleLayout} ref={reactionContainerRef}>
      <View style={styles.root} {...panResponder.current.panHandlers}>
        {reactionOrder.map((reactionType) => {
          const Reaction = reactionMap[reactionType]

          const status =
            selectedReaction === reactionType
              ? 'selected'
              : interacting === reactionType
                ? 'interacting'
                : selectedReaction
                  ? 'unselected'
                  : 'idle'

          return (
            <Reaction
              key={reactionType}
              status={status}
              onMeasure={handleMeasure}
              isVisible={isVisible}
              style={styleProp?.emoji}
              scale={scale}
            />
          )
        })}
      </View>
    </View>
  )
}
