import {
  Flex,
  IconLockUnlocked,
  IconSize,
  Text,
  useTheme
} from '@audius/harmony'
import IconLock from '@audius/harmony/src/assets/icons/Lock.svg'

const messages = {
  premiumLocked: 'Available for purchase',
  premiumUnlocked: 'Purchased'
}

export type LockedStatusBadgeProps = {
  locked: boolean
  variant?: 'premium' | 'gated' | 'tokenGated'
  text?: string
  /** Whether the badge is colored when locked */
  coloredWhenLocked?: boolean
  iconSize?: IconSize
  id?: string
}

export const LockedStatusBadge = (props: LockedStatusBadgeProps) => {
  const {
    locked,
    variant = 'gated',
    text,
    coloredWhenLocked = false,
    iconSize = 'xs',
    id
  } = props

  const LockComponent = locked ? IconLock : IconLockUnlocked

  const { color } = useTheme()

  const background =
    !locked || coloredWhenLocked
      ? variant === 'gated'
        ? color.special.blue
        : variant === 'tokenGated'
          ? color.special.coinGradient
          : color.special.lightGreen
      : color.neutral.n400

  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      gap='xs'
      pv={text ? 'xs' : '2xs'}
      ph='s'
      h={16}
      borderRadius='l'
      css={{ background }}
    >
      <LockComponent
        color='white'
        size={iconSize}
        id={text ? undefined : id}
        title={
          text
            ? undefined
            : variant === 'premium'
              ? locked
                ? messages.premiumLocked
                : messages.premiumUnlocked
              : undefined
        }
      />
      {text ? (
        <Text size='xs' variant='label' color='white' id={id}>
          {text}
        </Text>
      ) : null}
    </Flex>
  )
}
