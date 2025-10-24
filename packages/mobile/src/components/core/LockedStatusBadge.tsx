import { View } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'

import { IconLock, IconLockUnlocked, useTheme } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useColor } from 'app/utils/theme'

import { Text } from './Text'

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  root: {
    backgroundColor: palette.accentBlue,
    paddingHorizontal: spacing(2),
    paddingVertical: 1,
    borderRadius: spacing(10),
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(1),
    flexDirection: 'row'
  },
  premium: {
    backgroundColor: palette.specialLightGreen
  },
  locked: {
    backgroundColor: palette.neutralLight4
  }
}))

export type LockedStatusBadgeProps = {
  locked: boolean
  variant?: 'premium' | 'gated' | 'tokenGated'
  text?: string
  /** Whether the badge is colored when locked */
  coloredWhenLocked?: boolean
  iconSize?: 'medium' | 'small'
}

/** Renders a small badge with locked or unlocked icon */
export const LockedStatusBadge = (props: LockedStatusBadgeProps) => {
  const {
    locked,
    variant = 'gated',
    text,
    coloredWhenLocked = false,
    iconSize = 'medium'
  } = props
  const styles = useStyles()
  const staticWhite = useColor('white')
  const LockComponent = locked ? IconLock : IconLockUnlocked
  const { color } = useTheme()

  return variant === 'tokenGated' ? (
    <LinearGradient
      colors={
        locked
          ? [color.neutral.n400, color.neutral.n400]
          : color.special.coinGradient.colors
      }
      start={locked ? { x: 0, y: 0 } : color.special.coinGradient.start}
      end={locked ? { x: 1, y: 1 } : color.special.coinGradient.end}
      style={{ borderRadius: 10 }}
    >
      <View style={styles.root}>
        <LockComponent
          fill={staticWhite}
          width={iconSize === 'medium' ? spacing(3.5) : spacing(3)}
          height={iconSize === 'medium' ? spacing(3.5) : spacing(3)}
        />
        {text ? (
          <Text fontSize='xs' variant='label' color='white'>
            {text}
          </Text>
        ) : null}
      </View>
    </LinearGradient>
  ) : (
    <View
      style={[
        styles.root,
        locked && !coloredWhenLocked
          ? styles.locked
          : variant === 'premium'
            ? styles.premium
            : null
      ]}
    >
      <LockComponent
        fill={staticWhite}
        width={iconSize === 'medium' ? spacing(3.5) : spacing(3)}
        height={iconSize === 'medium' ? spacing(3.5) : spacing(3)}
      />
      {text ? (
        <Text fontSize='xs' variant='label' color='white'>
          {text}
        </Text>
      ) : null}
    </View>
  )
}
