import { useCallback } from 'react'

import { useRemixContest } from '@audius/common/api'

import { Flex, Paper, Text } from '@audius/harmony-native'
import { FlatList, UserGeneratedText } from 'app/components/core'
import { VideoEmbed } from 'app/components/video-embed/VideoEmbed'

import { useContestPage } from '../ContestPageContext'
import { ContestStemsCard } from '../ContestStemsCard'
import { EventFollowersCard } from '../EventFollowersCard'

const fallbackDescription =
  'Enter my remix contest before the deadline for your chance to win!'

const messages = {
  aboutThisContest: 'ABOUT THIS CONTEST',
  prizes: 'PRIZES'
}

/**
 * Details body. Uses the shared core `FlatList` wrapper with empty
 * data so its scroll hooks into the surrounding
 * `CollapsibleTabNavigatorContext` automatically — that's the
 * signal the collapsible header reads to slide away as the user
 * scrolls into this tab.
 *
 * Layout (Figma 2925-18101):
 *   - ABOUT THIS CONTEST  \ each wrapped in a Paper tile
 *   - PRIZES              /
 *   - FOLLOWERS card
 *   - STEMS & DOWNLOADS card (self-contained Paper)
 *
 * About and Prizes were previously rendered as bare Text + body
 * text sitting on the tab background, which broke the visual
 * hierarchy (every other Figma block is a card, but these two
 * floated inline). Wrapping them in the same `Paper` with a section
 * label at the top makes the tab read like the Figma reference.
 */
export const ContestDetailsTab = () => {
  const { trackId, eventId, description, hasDownloads, followerCount } =
    useContestPage()
  const { data: contest } = useRemixContest(trackId)
  const prizeInfo = (contest?.eventData as any)?.prizeInfo as string | undefined
  const videoUrl = (contest?.eventData as any)?.videoUrl as string | undefined

  const renderHeader = useCallback(
    () => (
      <Flex p='l' gap='l'>
        {/* About — full description text inside a Paper card. */}
        <Paper direction='column' p='l' gap='m' borderRadius='m' shadow='flat'>
          <Text variant='label' size='m' color='subdued'>
            {messages.aboutThisContest}
          </Text>
          <UserGeneratedText variant='body'>
            {description ?? fallbackDescription}
          </UserGeneratedText>
          {/* Optional embedded video (YouTube / Vimeo) configured on
              the Edit Contest "Video Link" field. Renders nothing when
              no URL is set or the URL isn't a YouTube / Vimeo link. */}
          <VideoEmbed url={videoUrl} />
        </Paper>

        {/* Prizes — only render the card when there's content. Empty
            cards looked like an unfinished section. */}
        {prizeInfo?.trim() ? (
          <Paper
            direction='column'
            p='l'
            gap='m'
            borderRadius='m'
            shadow='flat'
          >
            <Text variant='label' size='m' color='subdued'>
              {messages.prizes}
            </Text>
            <UserGeneratedText variant='body'>{prizeInfo}</UserGeneratedText>
          </Paper>
        ) : null}

        {/* Followers — hide entirely when the contest has no followers yet,
            mirroring how the Prizes tile hides on empty content. Rendering
            "0 followers" was QA-flagged as visually busy and unhelpful. */}
        {followerCount > 0 ? (
          <EventFollowersCard eventId={eventId} followerCount={followerCount} />
        ) : null}

        {hasDownloads ? <ContestStemsCard trackId={trackId} /> : null}
      </Flex>
    ),
    [
      description,
      trackId,
      eventId,
      followerCount,
      hasDownloads,
      prizeInfo,
      videoUrl
    ]
  )

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={renderHeader}
      keyExtractor={() => ''}
    />
  )
}
