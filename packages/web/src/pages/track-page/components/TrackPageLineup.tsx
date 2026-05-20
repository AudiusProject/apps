import { useMemo } from 'react'

import {
  getTrackPageLineupQueryKey,
  useRemixContest,
  useTrackPageLineup
} from '@audius/common/api'
import { User } from '@audius/common/models'
import { Flex, Text, IconRemix } from '@audius/harmony'
import type { IconComponent } from '@audius/harmony'

import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { TrackLineup } from 'components/lineup/TrackLineup'
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
  const { trackIds, indices, isPending, isFetching, isError } =
    useTrackPageLineup({ trackId })
  const { data: remixContest } = useRemixContest(trackId)
  const suppressRemixLineupForContest = !!remixContest

  const { isDesktop, isMobile } = useTrackPageSize()

  const isCommentingEnabled = !commentsDisabled
  const lineupVariant =
    (isCommentingEnabled && isDesktop) || isMobile
      ? LineupVariant.SECTION
      : LineupVariant.CONDENSED

  const querySource = useMemo(
    () => ({
      queryKey: [...getTrackPageLineupQueryKey(trackId)] as unknown[]
    }),
    [trackId]
  )

  const hasRemixSection =
    !suppressRemixLineupForContest &&
    (indices?.remixParentSection.index !== undefined ||
      indices?.remixesSection.index !== undefined)

  const willRenderNothing =
    !hasRemixSection &&
    indices?.moreBySection.index === undefined &&
    indices?.recommendedSection.index === undefined

  if (!indices || willRenderNothing) return null

  const renderRemixParentSection = () => {
    if (indices.remixParentSection.index === undefined || !trackId) return null

    const start = indices.remixParentSection.index
    const end = start + (indices.remixParentSection.pageSize ?? 0)
    const sectionTrackIds = trackIds.slice(start, end)
    const parentTrackId = sectionTrackIds[0]

    return (
      <Section title={messages.originalTrack}>
        <TrackLineup
          trackIds={sectionTrackIds}
          source='TRACK_PAGE_MORE_BY'
          querySource={querySource}
          variant={lineupVariant}
          isPending={isPending}
          isFetching={isFetching}
          isError={isError}
          hasNextPage={false}
        />
        {parentTrackId ? (
          <ViewOtherRemixesButton parentTrackId={parentTrackId} size='xs' />
        ) : null}
      </Section>
    )
  }

  const renderRemixesSection = () => {
    if (indices.remixesSection.index === undefined || !trackId) return null

    const start = indices.remixesSection.index
    const end = start + (indices.remixesSection.pageSize ?? 0)
    const sectionTrackIds = trackIds.slice(start, end)

    return (
      <Section title={messages.remixes} icon={IconRemix}>
        <TrackLineup
          trackIds={sectionTrackIds}
          source='TRACK_PAGE_REMIXES'
          querySource={querySource}
          variant={lineupVariant}
          isPending={isPending}
          isFetching={isFetching}
          isError={isError}
          hasNextPage={false}
        />
        <ViewOtherRemixesButton parentTrackId={trackId} size='xs' />
      </Section>
    )
  }

  const renderMoreBySection = () => {
    if (indices.moreBySection.index === undefined) return null

    const start = indices.moreBySection.index
    const end = start + (indices.moreBySection.pageSize ?? 0)
    const sectionTrackIds = trackIds.slice(start, end)

    return (
      <Section title={messages.moreBy(user?.name ?? '')}>
        <TrackLineup
          trackIds={sectionTrackIds}
          source='TRACK_PAGE_MORE_BY'
          querySource={querySource}
          variant={lineupVariant}
          isPending={isPending}
          isFetching={isFetching}
          isError={isError}
          hasNextPage={false}
        />
      </Section>
    )
  }

  const renderRecommendedSection = () => {
    if (indices.recommendedSection.index === undefined) return null

    const start = indices.recommendedSection.index
    const end = start + (indices.recommendedSection.pageSize ?? 0)
    const sectionTrackIds = trackIds.slice(start, end)

    return (
      <Section title={messages.youMightAlsoLike}>
        <TrackLineup
          trackIds={sectionTrackIds}
          source='TRACK_PAGE_MORE_BY'
          querySource={querySource}
          variant={lineupVariant}
          isPending={isPending}
          isFetching={isFetching}
          isError={isError}
          hasNextPage={false}
        />
      </Section>
    )
  }

  return (
    <Flex
      direction='column'
      alignItems={isCommentingEnabled ? 'flex-start' : 'center'}
      gap='2xl'
      flex={1}
      css={{
        minWidth: isCommentingEnabled ? MIN_DESKTOP_CONTENT_WIDTH_PX : 0,
        maxWidth: isCommentingEnabled ? '100%' : 774
      }}
    >
      {!suppressRemixLineupForContest ? renderRemixParentSection() : null}
      {!suppressRemixLineupForContest ? renderRemixesSection() : null}
      {renderMoreBySection()}
      {renderRecommendedSection()}
    </Flex>
  )
}
