import { useState, useCallback } from 'react'

import {
  useRemixContest,
  useRemixesLineup,
  useTrack,
  useUser
} from '@audius/common/api'
import { ID, Name, SquareSizes } from '@audius/common/models'
import { UPLOAD_PAGE } from '@audius/common/src/utils/route'
import { TrackMetadataForUpload } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconCloudUpload,
  IconTrophy,
  motion,
  spacing,
  Text
} from '@audius/harmony'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom-v5-compat'

import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { useRequiresAccountCallback } from 'hooks/useRequiresAccount'
import useTabs from 'hooks/useTabs/useTabs'
import { useUpdateSearchParams } from 'pages/search-page/hooks'
import { track, make } from 'services/analytics'
import { pickWinnersPage } from 'utils/route'

import { RemixContestSubmissionsTab } from '../shared/RemixContestSubmissionsTab'
import { RemixContestWinnersTab } from '../shared/RemixContestWinnersTab'

import { RemixContestDetailsTab } from './RemixContestDetailsTab'
import { RemixContestPrizesTab } from './RemixContestPrizesTab'
import { TabBody } from './TabBody'

const messages = {
  title: 'Remix Contest',
  details: 'Details',
  prizes: 'Prizes',
  winners: 'Winners',
  submissions: 'Submissions',
  uploadRemixButtonText: 'Upload Your Remix',
  pickWinners: 'Pick Winners',
  editWinners: 'Edit Winners'
}

const TAB_BAR_HEIGHT = 56
const TAB_PARAM = 'contest-tab'

type RemixContestSectionProps = {
  trackId: ID
  isOwner: boolean
}

/**
 * Section component that displays remix contest information for a track
 */
export const RemixContestSection = ({
  trackId,
  isOwner
}: RemixContestSectionProps) => {
  const navigate = useNavigateToPage()
  const { data: originalTrack } = useTrack(trackId)
  const { data: originalUser } = useUser(originalTrack?.owner_id)
  const { data: remixContest } = useRemixContest(trackId)
  const { data: remixes, count: remixCount = 0 } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })

  const [contentHeight, setContentHeight] = useState(0)
  const hasPrizeInfo = !!remixContest?.eventData?.prizeInfo
  const isContestEnded = dayjs(remixContest?.endDate).isBefore(dayjs())
  const hasWinners = (remixContest?.eventData?.winners?.length ?? 0) > 0

  const handleHeightChange = useCallback((height: number) => {
    setContentHeight(height)
  }, [])

  const tabs = [
    {
      text: messages.details,
      label: 'details'
    },
    ...(hasPrizeInfo
      ? [
          {
            text: messages.prizes,
            label: 'prizes'
          }
        ]
      : []),
    ...(hasWinners
      ? [
          {
            text: messages.winners,
            label: 'winners'
          }
        ]
      : [
          {
            text: remixCount
              ? `${messages.submissions} (${remixCount})`
              : messages.submissions,
            label: 'submissions'
          }
        ])
  ]

  const [urlSearchParams] = useSearchParams()
  const updateTabSearchParam = useUpdateSearchParams(TAB_PARAM)
  const tab =
    urlSearchParams.get(TAB_PARAM) ?? (hasWinners ? 'winners' : undefined)

  const { tabs: TabBar, body: ContentBody } = useTabs({
    onTabClick: updateTabSearchParam,
    tabs,
    initialTab: tab,
    elements: [
      <TabBody key='details' onHeightChange={handleHeightChange}>
        <RemixContestDetailsTab trackId={trackId} />
      </TabBody>,
      ...(hasPrizeInfo
        ? [
            <TabBody key='prizes' onHeightChange={handleHeightChange}>
              <RemixContestPrizesTab trackId={trackId} />
            </TabBody>
          ]
        : []),
      ...(hasWinners
        ? [
            <TabBody key='winners' onHeightChange={handleHeightChange}>
              <RemixContestWinnersTab
                trackId={trackId}
                winnerIds={remixContest?.eventData?.winners ?? []}
                count={remixCount}
              />
            </TabBody>
          ]
        : [
            <TabBody key='submissions' onHeightChange={handleHeightChange}>
              <RemixContestSubmissionsTab
                trackId={trackId}
                submissions={remixes.slice(0, 10)}
                count={remixCount}
              />
            </TabBody>
          ])
    ],
    isMobile: false
  })

  const pickWinnersRoute = pickWinnersPage(originalTrack?.permalink ?? '')

  const handlePickWinnersClick = useCallback(() => {
    if (remixContest?.eventId) {
      track(
        make({
          eventName: Name.REMIX_CONTEST_PICK_WINNERS_OPEN,
          remixContestId: remixContest.eventId,
          trackId
        })
      )
    }
  }, [remixContest?.eventId, trackId])

  const goToUploadWithRemix = useRequiresAccountCallback(async () => {
    if (!trackId) return

    let file: File | undefined
    const imageUrl =
      originalTrack?.artwork?.[SquareSizes.SIZE_1000_BY_1000] ?? ''

    if (imageUrl) {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      file = new File([blob], 'image.jpg', { type: blob.type })
    }

    const state: { initialMetadata: Partial<TrackMetadataForUpload> } = {
      initialMetadata: {
        ...(file
          ? {
              artwork: {
                url: imageUrl,
                file
              }
            }
          : {}),
        genre: originalTrack?.genre ?? '',
        remix_of: {
          tracks: [
            {
              parent_track_id: trackId,
              user: originalUser,
              has_remix_author_reposted: false,
              has_remix_author_saved: false
            }
          ]
        }
      }
    }
    navigate(UPLOAD_PAGE, state)
  }, [trackId, navigate, originalTrack, originalUser])
  if (!trackId || !remixContest) return null

  const totalBoxHeight = TAB_BAR_HEIGHT + contentHeight

  return (
    <Flex column gap='l'>
      <Flex alignItems='center' gap='s'>
        <IconTrophy color='default' />
        <Text variant='title' size='l'>
          {messages.title}
        </Text>
      </Flex>
      <Box
        backgroundColor='white'
        shadow='mid'
        borderRadius='l'
        border='default'
        css={{
          transition: motion.quick,
          overflow: 'hidden',
          height: totalBoxHeight
        }}
      >
        <Flex column pv='m'>
          <Flex justifyContent='space-between' borderBottom='default' ph='xl'>
            <Flex alignItems='center'>{TabBar}</Flex>
            {!isOwner && !isContestEnded ? (
              <Flex mb='m'>
                <Button
                  variant='secondary'
                  size='small'
                  onClick={goToUploadWithRemix}
                  iconLeft={IconCloudUpload}
                >
                  {messages.uploadRemixButtonText}
                </Button>
              </Flex>
            ) : isOwner && isContestEnded && remixCount > 0 ? (
              <Flex mb='m'>
                <Button
                  variant={hasWinners ? 'secondary' : 'primary'}
                  size='small'
                  onClick={handlePickWinnersClick}
                >
                  <Link to={pickWinnersRoute}>
                    {hasWinners ? messages.editWinners : messages.pickWinners}
                  </Link>
                </Button>
              </Flex>
            ) : (
              <Flex h={spacing.m + spacing['2xl']} />
            )}
          </Flex>
          {ContentBody}
        </Flex>
      </Box>
    </Flex>
  )
}
