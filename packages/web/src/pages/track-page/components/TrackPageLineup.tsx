import { useFeatureFlag } from '@audius/common/hooks'
import { User } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import { useTrackPageLineup } from '@audius/common/src/api/tan-query/useTrackPageLineup'
import { tracksActions } from '@audius/common/src/store/pages/track/lineup/actions'
import { Flex, Text, IconRemix } from '@audius/harmony'
import type { IconComponent } from '@audius/harmony'

import { TanQueryLineup } from 'components/lineup/TanQueryLineup'
import { LineupVariant } from 'components/lineup/types'

import { ViewOtherRemixesButton } from './ViewOtherRemixesButton'
import { useTrackPageSize } from './useTrackPageSize'

type TrackPageLineupProps = {
  user: User | null
  trackId: number | null | undefined
  commentsDisabled?: boolean
}

type SectionProps = {
  title: string
  icon?: IconComponent
  children: React.ReactNode
}

const Section = ({ title, icon: Icon, children }: SectionProps) => {
  return (
    <Flex direction='column' gap='l' w='100%'>
      <Flex gap='s' alignItems='center'>
        {Icon && <Icon color='default' />}
        <Text variant='title' size='l'>
          {title}
        </Text>
      </Flex>
      {children}
    </Flex>
  )
}

const messages = {
  originalTrack: 'Original Track',
  remixes: 'Remixes of this Track',
  moreBy: (name: string) => `More by ${name}`,
  youMightAlsoLike: 'You Might Also Like'
}

export const TrackPageLineup = ({
  user,
  trackId,
  commentsDisabled
}: TrackPageLineupProps) => {
  const { indices, ...lineupData } = useTrackPageLineup({ trackId })

  const { isDesktop, isMobile } = useTrackPageSize()

  const { isEnabled: commentsFlagEnabled } = useFeatureFlag(
    FeatureFlags.COMMENTS_ENABLED
  )
  const isCommentingEnabled = commentsFlagEnabled && !commentsDisabled
  const lineupVariant =
    (isCommentingEnabled && isDesktop) || isMobile
      ? LineupVariant.SECTION
      : LineupVariant.CONDENSED

  if (!indices) return null

  const renderRemixParentSection = () => {
    if (indices.remixParentSection.index === undefined || !trackId) return null

    return (
      <Section title={messages.originalTrack}>
        <TanQueryLineup
          {...lineupData}
          maxEntries={indices.remixParentSection.pageSize}
          variant={lineupVariant}
          offset={indices.remixParentSection.index}
          actions={tracksActions}
        />
        <ViewOtherRemixesButton parentTrackId={trackId} size='xs' />
      </Section>
    )
  }

  const renderRemixesSection = () => {
    if (indices.remixesSection.index === undefined || !trackId) return null

    return (
      <Section title={messages.remixes} icon={IconRemix}>
        <TanQueryLineup
          {...lineupData}
          maxEntries={indices.remixesSection.pageSize}
          variant={lineupVariant}
          offset={indices.remixesSection.index}
          actions={tracksActions}
        />
        <ViewOtherRemixesButton parentTrackId={trackId} size='xs' />
      </Section>
    )
  }

  const renderMoreBySection = () => {
    if (indices.moreBySection.index === undefined) return null

    return (
      <Section title={messages.moreBy(user?.name ?? '')}>
        <TanQueryLineup
          {...lineupData}
          maxEntries={indices.moreBySection.pageSize}
          variant={lineupVariant}
          offset={indices.moreBySection.index}
          actions={tracksActions}
        />
      </Section>
    )
  }

  const renderRecommendedSection = () => {
    if (indices.recommendedSection.index === undefined) return null

    return (
      <Section title={messages.youMightAlsoLike}>
        <TanQueryLineup
          {...lineupData}
          maxEntries={indices.recommendedSection.pageSize}
          variant={lineupVariant}
          offset={indices.recommendedSection.index}
          actions={tracksActions}
        />
      </Section>
    )
  }

  return (
    <Flex
      direction='column'
      alignItems={isCommentingEnabled && isDesktop ? 'flex-start' : 'center'}
      gap='2xl'
      flex={1}
      css={{
        minWidth: 330,
        maxWidth: isCommentingEnabled ? '100%' : 774
      }}
    >
      {renderRemixParentSection()}
      {renderRemixesSection()}
      {renderMoreBySection()}
      {renderRecommendedSection()}
    </Flex>
  )
}
