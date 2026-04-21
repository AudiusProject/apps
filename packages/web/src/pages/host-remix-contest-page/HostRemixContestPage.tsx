import { useCallback, useMemo, useState } from 'react'

import {
  useCreateEvent,
  useCurrentUserId,
  useDeleteEvent,
  useRemixContest,
  useRemixesLineup,
  useTrack,
  useTrackByPermalink,
  useUpdateEvent,
  useUser
} from '@audius/common/api'
import { remixMessages } from '@audius/common/messages'
import { Name, SquareSizes } from '@audius/common/models'
import { dayjs } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconCloudUpload,
  IconKebabHorizontal,
  IconTrophy,
  PopupMenu,
  Paper,
  Select,
  Text,
  TextInput,
  TextArea
} from '@audius/harmony'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { useNavigate, useParams } from 'react-router'

import { DatePicker } from 'components/edit/fields/DatePickerField'
import { mergeReleaseDateValues } from 'components/edit/fields/visibility/mergeReleaseDateValues'
import Page from 'components/page/Page'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { track, make } from 'services/analytics'
import { fullContestPage, fullTrackPage } from 'utils/route'

import { TimeInput, parseTime } from '../../components/host-remix-contest-modal/TimeInput'

const messages = {
  pageTitle: 'Create Contest',
  editPageTitle: 'Edit Contest',
  required: ' *',
  titleLabel: 'Contest Title',
  titleHelper: 'This is the public title of your remix contest.',
  titlePlaceholder: 'Contest Title',
  descriptionLabel: 'Description',
  descriptionHelper:
    'Tell artists what the contest is about, rules, judging criteria…',
  descriptionPlaceholder:
    'Tell artists what the contest is about, rules, judging criteria…',
  videoLabel: 'Video Link',
  videoHelper: 'Add a YouTube or Vimeo link to embed it on your page.',
  videoPlaceholder:
    'https://www.youtube.com/watch?v=...',
  deadlineLabel: 'Submission Deadline',
  deadlineHelper:
    'Remixes submitted after this date will not be accepted. Local timezone applies.',
  coverPhotoLabel: 'Cover Photo',
  coverPhotoHelper: 'This image will represent your remix contest.',
  coverPhotoPlaceholder:
    'Drag-and-drop an image here, or browse to upload',
  coverPhotoComingSoon:
    'Upload coming soon — temporarily paste an image URL below to override the track artwork default.',
  coverPhotoUrlLabel: 'Cover image URL (optional)',
  prizesLabel: 'Prizes',
  prizesHelper: 'Describe all prizes, rewards, or other incentives.',
  prizesPlaceholder: '1st place gets $500. 2nd place gets $250…',
  sourceTracksLabel: 'Source Tracks',
  sourceTracksHelper:
    'Choose one or more tracks to be linked to this contest. Any stems included in that track will also be part of this contest.',
  sourceTracksSectionLabel: 'SOURCE TRACKS',
  addTrack: '+ Add Track',
  uploadNow: 'Upload Now',
  cancel: 'Cancel',
  saveDraft: 'Save Draft',
  launch: 'Launch',
  save: 'Save',
  turnOff: 'Turn off contest',
  visitTrack: 'Visit Track',
  editTrack: 'Edit Track',
  manageStems: 'Manage Stems',
  remove: 'Remove',
  noStems: 'No Stems',
  stemsCount: (n: number) => `${n} Stem${n === 1 ? '' : 's'}`
}

const SOURCE_TRACK_ROW_HEIGHT = 56
const COVER_PHOTO_HEIGHT = 200

type ContestEventData = {
  description?: string
  prizeInfo?: string
  winners?: unknown[]
  title?: string
  videoUrl?: string
  coverPhotoUrl?: string
  sourceTrackIds?: number[]
}

/**
 * Full-page Create / Edit Remix Contest flow. Replaces the legacy
 * HostRemixContestModal. Route: /:handle/:slug/host-contest.
 *
 * When the target track already has a remix_contest event, the form
 * loads into "edit" mode pre-filled from event_data.
 *
 * New fields (Title, Video Link, Cover Photo, Source Tracks) live as
 * extra keys inside event_data — the backend entity_manager accepts
 * arbitrary JSON, so no schema change is required. The single
 * `entity_id` still points at the primary track; additional source
 * tracks live in `event_data.sourceTrackIds`.
 */
export const HostRemixContestPage = () => {
  const navigate = useNavigate()
  useRequiresAccount()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()

  const { data: currentUserId } = useCurrentUserId()
  const { data: primaryTrack } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const trackId = primaryTrack?.track_id
  const { data: remixContest } = useRemixContest(trackId)
  const { data: remixes, isLoading: remixesLoading } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })

  const { mutate: createEvent } = useCreateEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: deleteEvent } = useDeleteEvent()

  const isEdit = !!remixContest
  const hasContestEntries = remixesLoading || (remixes && remixes.length > 0)
  const displayTurnOffButton = !hasContestEntries && isEdit
  const contestMinDate = useMemo(
    () => (remixContest ? dayjs(remixContest.endDate) : dayjs()),
    [remixContest]
  )
  const existingEventData = (remixContest?.eventData ?? {}) as ContestEventData

  const primaryPermalink = primaryTrack?.permalink ?? ''

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [title, setTitle] = useState(existingEventData.title ?? '')
  const [description, setDescription] = useState(
    existingEventData.description ?? ''
  )
  const [descriptionError, setDescriptionError] = useState(false)
  const [videoUrl, setVideoUrl] = useState(existingEventData.videoUrl ?? '')
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(
    existingEventData.coverPhotoUrl ?? ''
  )
  const [prizeInfo, setPrizeInfo] = useState(existingEventData.prizeInfo ?? '')

  const [contestEndDate, setContestEndDate] = useState<dayjs.Dayjs | null>(
    remixContest ? dayjs(remixContest.endDate) : null
  )
  const [endDateTouched, setEndDateTouched] = useState(false)
  const [endDateError, setEndDateError] = useState(false)
  const [timeValue, setTimeValue] = useState(
    contestEndDate ? dayjs(contestEndDate).format('hh:mm') : ''
  )
  const [timeError, setTimeError] = useState(false)
  const [meridianValue, setMeridianValue] = useState(
    contestEndDate ? dayjs(contestEndDate).format('A') : ''
  )

  const [sourceTrackIds, setSourceTrackIds] = useState<number[]>(
    existingEventData.sourceTrackIds ?? (trackId ? [trackId] : [])
  )

  // ---------------------------------------------------------------------------
  // Cover-photo fallback to track artwork
  // ---------------------------------------------------------------------------
  const { imageUrl: trackArtworkUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const resolvedCoverUrl = coverPhotoUrl || trackArtworkUrl

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleEndDateChange = useCallback(
    (value: string) => {
      setContestEndDate(dayjs(value))
      if (value && !timeValue) {
        setTimeValue('11:59')
        setMeridianValue('PM')
      }
      setEndDateError(false)
    },
    [timeValue]
  )

  const handleTimeChange = useCallback((value: string) => {
    setTimeValue(value)
    setEndDateError(false)
  }, [])

  const handleTimeError = useCallback((hasError: boolean) => {
    setTimeError(hasError)
  }, [])

  const handleMeridianChange = useCallback((value: string) => {
    setMeridianValue(value)
    setEndDateError(false)
  }, [])

  const handleAddSourceTrack = useCallback(() => {
    // Chunk 2 — wire the AddSourceTrackModal.
    // Stubbed so the button is clickable but noops for now.
    // eslint-disable-next-line no-console
    console.info('Add Source Track modal coming in follow-up')
  }, [])

  const handleRemoveSourceTrack = useCallback((id: number) => {
    setSourceTrackIds((prev) => prev.filter((x) => x !== id))
  }, [])

  const handleCancel = useCallback(() => {
    if (!primaryPermalink) {
      navigate(-1)
      return
    }
    navigate(
      isEdit
        ? fullContestPage(primaryPermalink)
        : fullTrackPage(primaryPermalink)
    )
  }, [isEdit, navigate, primaryPermalink])

  const handleSubmit = useCallback(() => {
    const parsedTime = parseTime(timeValue)
    if (!parsedTime) return

    const parsedDate = mergeReleaseDateValues(
      contestEndDate?.toISOString() ?? '',
      parsedTime,
      meridianValue
    )

    const hasDescriptionError = !description
    const hasDateError =
      !parsedDate ||
      dayjs(parsedDate.toISOString()).isBefore(contestMinDate) ||
      dayjs(parsedDate.toISOString()).isAfter(dayjs().add(90, 'days'))
    const hasError = hasDateError || hasDescriptionError

    setEndDateTouched(true)
    setEndDateError(hasDateError)
    setDescriptionError(hasDescriptionError)
    if (hasError || !trackId || !currentUserId) return

    const endDate = parsedDate.toISOString()
    const eventData: ContestEventData = {
      description,
      prizeInfo,
      winners: existingEventData.winners ?? [],
      title: title.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      coverPhotoUrl: coverPhotoUrl.trim() || undefined,
      sourceTrackIds:
        sourceTrackIds.length > 0 ? sourceTrackIds : undefined
    }

    if (isEdit && remixContest) {
      updateEvent({
        eventId: remixContest.eventId,
        eventData,
        endDate,
        userId: currentUserId
      })

      track(
        make({
          eventName: Name.REMIX_CONTEST_UPDATE,
          remixContestId: remixContest.eventId,
          trackId
        })
      )
    } else {
      createEvent({
        eventType: EventEventTypeEnum.RemixContest,
        entityType: EventEntityTypeEnum.Track,
        entityId: trackId,
        eventData,
        endDate,
        userId: currentUserId
      })

      track(
        make({
          eventName: Name.REMIX_CONTEST_CREATE,
          trackId
        })
      )
    }

    if (primaryPermalink) {
      navigate(fullContestPage(primaryPermalink))
    }
  }, [
    timeValue,
    contestEndDate,
    meridianValue,
    description,
    prizeInfo,
    title,
    videoUrl,
    coverPhotoUrl,
    sourceTrackIds,
    existingEventData.winners,
    contestMinDate,
    trackId,
    currentUserId,
    isEdit,
    remixContest,
    updateEvent,
    createEvent,
    primaryPermalink,
    navigate
  ])

  const handleDeleteEvent = useCallback(() => {
    if (!remixContest || !currentUserId) return
    deleteEvent({ eventId: remixContest.eventId, userId: currentUserId })

    if (trackId) {
      track(
        make({
          eventName: Name.REMIX_CONTEST_DELETE,
          remixContestId: remixContest.eventId,
          trackId
        })
      )
    }
    if (primaryPermalink) {
      navigate(fullTrackPage(primaryPermalink))
    }
  }, [
    remixContest,
    currentUserId,
    deleteEvent,
    trackId,
    primaryPermalink,
    navigate
  ])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (!primaryTrack) {
    return null
  }

  return (
    <Page
      title={isEdit ? messages.editPageTitle : messages.pageTitle}
      variant='flush'
    >
      <Box p='2xl' css={{ maxWidth: 840, margin: '0 auto', width: '100%' }}>
        <Flex direction='column' gap='l'>
          <Text variant='heading' size='l' color='accent'>
            {isEdit ? messages.editPageTitle : messages.pageTitle}
          </Text>

          {/* Section: Contest Title */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.titleLabel}
                <Text color='accent' tag='span'>
                  {messages.required}
                </Text>
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.titleHelper}
              </Text>
            </Flex>
            <TextInput
              label={messages.titleLabel}
              hideLabel
              placeholder={messages.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Paper>

          {/* Section: Description */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.descriptionLabel}
                <Text color='accent' tag='span'>
                  {messages.required}
                </Text>
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.descriptionHelper}
              </Text>
            </Flex>
            <TextArea
              aria-label={messages.descriptionLabel}
              placeholder={messages.descriptionPlaceholder}
              maxLength={1000}
              value={description}
              error={descriptionError}
              helperText={
                descriptionError ? remixMessages.descriptionError : undefined
              }
              onChange={(e) => setDescription(e.target.value)}
              css={{ minHeight: 144, maxHeight: 300 }}
              showMaxLength
            />
          </Paper>

          {/* Section: Video Link */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.videoLabel}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.videoHelper}
              </Text>
            </Flex>
            <TextInput
              label={messages.videoLabel}
              hideLabel
              placeholder={messages.videoPlaceholder}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
          </Paper>

          {/* Section: Submission Deadline */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.deadlineLabel}
                <Text color='accent' tag='span'>
                  {messages.required}
                </Text>
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.deadlineHelper}
              </Text>
            </Flex>
            <Flex gap='l'>
              <Box css={{ flex: 1 }}>
                <DatePicker
                  name='contestEndDate'
                  label={remixMessages.endDateLabel}
                  onChange={handleEndDateChange}
                  value={contestEndDate?.toISOString()}
                  error={endDateError ? remixMessages.endDateError : undefined}
                  touched={endDateTouched}
                  minDate={contestMinDate.toDate()}
                  maxDate={dayjs().add(90, 'days').toDate()}
                />
              </Box>
              <TimeInput
                css={{ flex: 1 }}
                label={remixMessages.timeLabel}
                placeholder={remixMessages.timePlaceholder}
                disabled={!contestEndDate}
                value={timeValue}
                helperText={timeError ? remixMessages.timeError : undefined}
                onChange={handleTimeChange}
                onError={handleTimeError}
              />
              <Select
                css={{ flex: 1 }}
                label={remixMessages.meridianLabel}
                placeholder={remixMessages.meridianPlaceholder}
                hideLabel
                disabled={!contestEndDate}
                value={meridianValue}
                onChange={handleMeridianChange}
                options={[
                  { value: 'AM', label: 'AM' },
                  { value: 'PM', label: 'PM' }
                ]}
              />
            </Flex>
          </Paper>

          {/* Section: Cover Photo */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.coverPhotoLabel}
                <Text color='accent' tag='span'>
                  {messages.required}
                </Text>
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.coverPhotoHelper}
              </Text>
            </Flex>
            <Box
              h={COVER_PHOTO_HEIGHT}
              css={{
                border: '1px dashed var(--harmony-border-default)',
                borderRadius: 8,
                backgroundImage: resolvedCoverUrl
                  ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${resolvedCoverUrl})`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Flex direction='column' alignItems='center' gap='s'>
                <IconCloudUpload
                  size='2xl'
                  color={resolvedCoverUrl ? 'staticWhite' : 'subdued'}
                />
                <Text
                  variant='body'
                  size='s'
                  color={resolvedCoverUrl ? 'staticWhite' : 'subdued'}
                >
                  {messages.coverPhotoPlaceholder}
                </Text>
              </Flex>
            </Box>
            {/* Chunk 2: wire real mediorum upload. For now, expose a URL
                input as a stop-gap so the form can persist a cover. */}
            <Flex direction='column' gap='xs'>
              <Text variant='body' size='s' color='subdued'>
                {messages.coverPhotoComingSoon}
              </Text>
              <TextInput
                label={messages.coverPhotoUrlLabel}
                hideLabel
                placeholder='https://…'
                value={coverPhotoUrl}
                onChange={(e) => setCoverPhotoUrl(e.target.value)}
              />
            </Flex>
          </Paper>

          {/* Section: Prizes */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.prizesLabel}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.prizesHelper}
              </Text>
            </Flex>
            <TextArea
              aria-label={messages.prizesLabel}
              placeholder={messages.prizesPlaceholder}
              maxLength={1000}
              value={prizeInfo}
              onChange={(e) => setPrizeInfo(e.target.value)}
              css={{ minHeight: 144, maxHeight: 300 }}
              showMaxLength
            />
          </Paper>

          {/* Section: Source Tracks */}
          <Paper
            direction='column'
            p='xl'
            gap='m'
            border='default'
            borderRadius='m'
          >
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l' tag='label'>
                {messages.sourceTracksLabel}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.sourceTracksHelper}
              </Text>
            </Flex>
            <Flex gap='s'>
              <Button
                variant='primary'
                fullWidth
                onClick={handleAddSourceTrack}
              >
                {messages.addTrack}
              </Button>
              <Button variant='secondary' iconLeft={IconCloudUpload}>
                {messages.uploadNow}
              </Button>
            </Flex>
            {sourceTrackIds.length > 0 ? (
              <Flex direction='column' gap='xs'>
                <Text variant='label' size='s' color='subdued'>
                  {messages.sourceTracksSectionLabel}
                </Text>
                <Flex direction='column'>
                  {sourceTrackIds.map((id) => (
                    <SourceTrackRow
                      key={id}
                      sourceTrackId={id}
                      onRemove={() => handleRemoveSourceTrack(id)}
                    />
                  ))}
                </Flex>
              </Flex>
            ) : null}
          </Paper>

          {/* Actions row */}
          <Flex justifyContent='space-between' pt='l'>
            <Button variant='secondary' onClick={handleCancel}>
              {messages.cancel}
            </Button>
            <Flex gap='s'>
              {displayTurnOffButton ? (
                <Button variant='destructive' onClick={handleDeleteEvent}>
                  {messages.turnOff}
                </Button>
              ) : null}
              {/* Save Draft is scoped out for now (Chunk 2) — no draft
                  model exists on the backend yet. */}
              <Button variant='secondary' disabled>
                {messages.saveDraft}
              </Button>
              <Button
                variant='primary'
                onClick={handleSubmit}
                disabled={!contestEndDate || endDateError || timeError}
              >
                {isEdit ? messages.save : messages.launch}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Box>
    </Page>
  )
}

// ----- Source-track row ------------------------------------------------------

type SourceTrackRowProps = {
  sourceTrackId: number
  onRemove: () => void
}

const SourceTrackRow = ({ sourceTrackId, onRemove }: SourceTrackRowProps) => {
  const { data: trackData } = useTrack(sourceTrackId, {
    select: (t) =>
      t
        ? {
            title: t.title,
            owner_id: t.owner_id,
            is_downloadable: t.is_downloadable,
            stem_of: t.stem_of
          }
        : undefined
  })
  const { data: owner } = useUser(trackData?.owner_id)
  const { imageUrl: artworkUrl } = useTrackCoverArt({
    trackId: sourceTrackId,
    size: SquareSizes.SIZE_150_BY_150
  })

  // Real stems count comes from useStems — Chunk 2 wires the full fetch +
  // pluralisation. For now surface a simple flag derived from the track.
  const stemsLabel = trackData?.is_downloadable
    ? messages.stemsCount(0)
    : messages.noStems

  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      gap='m'
      h={SOURCE_TRACK_ROW_HEIGHT}
      css={{ borderTop: '1px solid var(--harmony-border-default)' }}
    >
      <Flex gap='m' alignItems='center' css={{ minWidth: 0, flex: 1 }}>
        <Box
          css={{
            width: 40,
            height: 40,
            borderRadius: 4,
            backgroundImage: artworkUrl ? `url(${artworkUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0
          }}
        />
        <Flex direction='column' css={{ minWidth: 0 }}>
          <Text variant='body' size='m' ellipses>
            {trackData?.title ?? '—'}
          </Text>
          <Text variant='body' size='s' color='subdued' ellipses>
            {owner?.name ?? ''}
          </Text>
        </Flex>
      </Flex>
      <Flex gap='s' alignItems='center'>
        <Text variant='label' size='s' color='subdued'>
          {stemsLabel}
        </Text>
        <PopupMenu
          items={[
            {
              text: messages.visitTrack,
              onClick: () => {
                /* Chunk 2: navigate */
              }
            },
            {
              text: messages.editTrack,
              onClick: () => {
                /* Chunk 2: open edit-track */
              }
            },
            {
              text: messages.manageStems,
              onClick: () => {
                /* Chunk 2: open ManageStemsModal */
              }
            },
            { text: messages.remove, onClick: onRemove }
          ]}
          renderTrigger={(ref, triggerPopup) => (
            <Button
              ref={ref as any}
              variant='secondary'
              size='small'
              iconLeft={IconKebabHorizontal}
              aria-label='Track actions'
              onClick={() => triggerPopup()}
            />
          )}
        />
        <Button
          variant='secondary'
          size='small'
          aria-label='Remove track'
          onClick={onRemove}
        >
          ×
        </Button>
      </Flex>
    </Flex>
  )
}

export default HostRemixContestPage

// Re-export the icon name used by the header decoration so WebPlayer can
// pass `<IconTrophy />` directly without a duplicate import.
export { IconTrophy }
