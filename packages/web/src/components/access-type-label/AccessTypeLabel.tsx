import { AccessType } from '@audius/common/models'
import { formatReleaseDate } from '@audius/common/utils'
import {
  IconSparkles,
  IconCart,
  IconCollectible,
  IconReceive,
  IconCalendarMonth,
  IconVisibilityHidden,
  IconColors,
  Flex,
  Text
} from '@audius/harmony'

type AccessTypeLabelProps = {
  type?: AccessType
  scheduledReleaseDate?: string
  isUnlocked?: boolean
}

type AccessTypeConfig = {
  icon: typeof IconSparkles
  label: string | ((date?: string) => string)
  color: IconColors
}

const formatScheduledDate = (date: string) =>
  `Releases ${formatReleaseDate({ date, withHour: true })}`

const ACCESS_TYPE_CONFIG: Record<AccessType, AccessTypeConfig> = {
  [AccessType.SCHEDULED_RELEASE]: {
    icon: IconCalendarMonth,
    label: (date?: string) =>
      date ? formatScheduledDate(date) : 'Scheduled Release',
    color: 'accent'
  },
  [AccessType.HIDDEN]: {
    icon: IconVisibilityHidden,
    label: 'Hidden',
    color: 'subdued'
  },
  [AccessType.PREMIUM]: {
    icon: IconCart,
    label: 'Premium',
    color: 'premium'
  },
  [AccessType.PREMIUM_EXTRAS]: {
    icon: IconReceive,
    label: 'Extras',
    color: 'premium'
  },
  [AccessType.SPECIAL_ACCESS]: {
    icon: IconSparkles,
    label: 'Special Access',
    color: 'special'
  },
  [AccessType.COLLECTIBLE_GATED]: {
    icon: IconCollectible,
    label: 'Collectible Gated',
    color: 'special'
  },
  [AccessType.EXTRAS]: {
    icon: IconReceive,
    label: 'Extras',
    color: 'subdued'
  }
}

export const AccessTypeLabel = (props: AccessTypeLabelProps) => {
  const { type, scheduledReleaseDate, isUnlocked } = props
  if (!type) return null

  const config = ACCESS_TYPE_CONFIG[type]
  const label =
    typeof config.label === 'function'
      ? config.label(scheduledReleaseDate)
      : config.label

  return (
    <Flex gap='xs' alignItems='center'>
      {config.icon ? (
        <config.icon color={isUnlocked ? 'subdued' : config.color} size='s' />
      ) : null}
      <Text size='xs' color={isUnlocked ? 'subdued' : config.color} ellipses>
        {label}
      </Text>
    </Flex>
  )
}
