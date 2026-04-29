import { useMemo } from 'react'

import {
  getTrackPageLineupQueryKey,
  useRemixContest,
  useTrackPageLineup
} from '@audius/common/api'
import { trackPageMessages as messages } from '@audius/common/messages'
import type { ID, User } from '@audius/common/models'

import { Flex, Text } from '@audius/harmony-native'
import { TrackLineup } from 'app/components/lineup/TrackLineup'

import { ViewOtherRemixesButton } from './ViewOtherRemixesButton'

type TrackScreenLineupProps = {
  user: User | null
  trackId: ID
}

type SectionProps = {
  title: string
  children: React.ReactNode
}

const Section = ({ title, children }: SectionProps) => {
  return (
    <Flex w='100%'>
      <Text variant='title' size='l'>
        {title}
      </Text>
      {children}
    </Flex>
  )
}

const itemStyles = {
  paddingHorizontal: 0
}

export const TrackScreenLineup = ({
  user,
  trackId
}: TrackScreenLineupProps) => {
  const { trackIds, indices, isFetching, isPending } = useTrackPageLineup({
    trackId
  })
  const { data: remixContest } = useRemixContest(trackId)
  const isRemixContest = !!remixContest

  const querySource = useMemo(
    () => ({
      queryKey: [...getTrackPageLineupQueryKey(trackId)] as unknown[]
    }),
    [trackId]
  )

  if (!indices) return null

  const renderRemixParentSection = () => {
    if (indices.remixParentSection.index === undefined) return null

    const start = indices.remixParentSection.index
    const end = start + (indices.remixParentSection.pageSize ?? 0)
    const sectionTrackIds = trackIds.slice(start, end)
    const parentTrackId = sectionTrackIds[0]

    return (
      <Section title={messages.originalTrack}>
        <Flex column gap='l'>
          <TrackLineup
            trackIds={sectionTrackIds}
            source='TRACK_PAGE_MORE_BY'
            querySource={querySource}
            isFetching={isFetching}
            isPending={isPending}
            hasNextPage={false}
            itemStyles={itemStyles}
          />
          {parentTrackId ? (
            <ViewOtherRemixesButton parentTrackId={parentTrackId} />
          ) : null}
        </Flex>
      </Section>
    )
  }

  const renderRemixesSection = () => {
    if (indices.remixesSection.index === undefined) return null

    const start = indices.remixesSection.index
    const end = start + (indices.remixesSection.pageSize ?? 0)
    const sectionTrackIds = trackIds.slice(start, end)

    return (
      <Section title={messages.remixes}>
        <Flex column gap='l'>
          <TrackLineup
            trackIds={sectionTrackIds}
            source='TRACK_PAGE_REMIXES'
            querySource={querySource}
            isFetching={isFetching}
            isPending={isPending}
            hasNextPage={false}
            itemStyles={itemStyles}
          />
          <ViewOtherRemixesButton parentTrackId={trackId} />
        </Flex>
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
          isFetching={isFetching}
          isPending={isPending}
          hasNextPage={false}
          itemStyles={itemStyles}
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
          isFetching={isFetching}
          isPending={isPending}
          hasNextPage={false}
          itemStyles={itemStyles}
        />
      </Section>
    )
  }

  return (
    <Flex direction='column' gap='2xl'>
      {!isRemixContest ? renderRemixParentSection() : null}
      {!isRemixContest ? renderRemixesSection() : null}
      {renderMoreBySection()}
      {renderRecommendedSection()}
    </Flex>
  )
}
