import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  useCreateEvent,
  useCurrentUserId,
  useDeleteEvent,
  useRemixContest,
  useRemixesLineup,
  useStems,
  useTrack,
  useTrackByPermalink,
  useUpdateEvent,
  useUser
} from '@audius/common/api'
import { remixMessages } from '@audius/common/messages'
import { Name, SquareSizes } from '@audius/common/models'
import {
  dayjs,
  getVideoThumbnailUrl,
  parseVideoUrl,
  route
} from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  Hint,
  IconClose,
  IconCloudUpload,
  IconKebabHorizontal,
  IconPlay,
  IconTrophy,
  LoadingSpinner,
  PlainButton,
  PopupMenu,
  Paper,
  Select,
  Text,
  TextArea,
  TextInput
} from '@audius/harmony'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'
import { useNavigate, useParams } from 'react-router'

import { ConfirmationModal } from 'components/confirmation-modal/ConfirmationModal'
import { DatePicker } from 'components/edit/fields/DatePickerField'
import { mergeReleaseDateValues } from 'components/edit/fields/visibility/mergeReleaseDateValues'
import Page from 'components/page/Page'
import { useRequiresAccount } from 'hooks/useRequiresAccount'
import { useTrackCoverArt } from 'hooks/useTrackCoverArt'
import { track, make } from 'services/analytics'
import { contestPage } from 'utils/route'

import {
  TimeInput,
  parseTime
} from '../../components/host-remix-contest-modal/TimeInput'
import { AttachVideoModal } from '../fan-club-detail-page/components/AttachVideoModal'

import { AddSourceTrackModal } from './AddSourceTrackModal'
import { ManageStemsModal } from './ManageStemsModal'
import { useContestDraft } from './useContestDraft'
import { useUploadContestCover } from './useUploadContestCover'

const { CONTESTS_PAGE } = route

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
  videoPlaceholder: 'https://www.youtube.com/watch?v=...',
  deadlineLabel: 'Submission Deadline',
  deadlineHelper:
    'Remixes submitted after this date will not be accepted. Local timezone applies.',
  coverPhotoLabel: 'Cover Photo',
  coverPhotoHelper:
    "Optional — defaults to the track's artwork if you don't upload one.",
  coverPhotoPlaceholder: 'Drag-and-drop an image here, or browse to upload',
  coverPhotoUploadFailed:
    'Upload failed. Try again or leave blank to use the track artwork.',
  prizesLabel: 'Prizes',
  prizesHelper: 'Describe all prizes, rewards, or other incentives.',
  prizesPlaceholder: '1st place gets $500. 2nd place gets $250…',
  sourceTracksLabel: 'Source Track',
  sourceTracksHelper:
    'Choose a track to be linked to this contest. Any stems included in that track will also be part of this contest.',
  sourceTracksSectionLabel: 'SOURCE TRACK',
  addTrack: '+ Add Track',
  cancel: 'Cancel',
  saveDraft: 'Save Draft',
  draftSaved: 'Draft saved',
  launch: 'Launch',
  save: 'Save',
  turnOff: 'Delete Contest',
  deleteConfirmTitle: 'Delete Contest?',
  deleteConfirmDescription:
    'Are you sure you want to delete this contest? This cannot be undone.',
  deleteConfirm: 'Delete',
  deleteCancel: 'Cancel',
  visitTrack: 'Visit Track',
  editTrack: 'Edit Track',
  manageStems: 'Manage Stems',
  remove: 'Remove',
  noStems: 'No Stems',
  stemsCount: (n: number) => `${n} Stem${n === 1 ? '' : 's'}`,
  draftRestoreTitle: (savedAt: string) =>
    `You have an unsaved draft from ${savedAt}.`,
  restoreDraft: 'Restore Draft',
  discardDraft: 'Discard'
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
 * HostRemixContestModal.
 *
 * Routes:
 *   /:handle/:slug/host-contest — track-scoped entry (from a track page).
 *   /host-contest               — track-less entry (from the contests
 *                                 discovery page). User picks exactly one
 *                                 Source Track, which becomes the event's
 *                                 `entity_id`.
 *
 * When the target track already has a remix_contest event, the form
 * loads into "edit" mode pre-filled from event_data.
 *
 * New fields (Title, Video Link, Cover Photo, Source Tracks) live as
 * extra keys inside event_data — the backend entity_manager accepts
 * arbitrary JSON, so no schema change is required. `entity_id` points
 * at the primary / first source track.
 */
export const HostRemixContestPage = () => {
  const navigate = useNavigate()
  useRequiresAccount()
  const { handle, slug } = useParams<{ handle?: string; slug?: string }>()

  const { data: currentUserId } = useCurrentUserId()
  const { data: primaryTrack } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const primaryTrackId = primaryTrack?.track_id
  // Only track-scoped entry (primaryTrack present) can show an existing
  // contest in edit mode. Track-less entry is always create-mode.
  const { data: remixContest } = useRemixContest(primaryTrackId)
  const { data: remixes, isLoading: remixesLoading } = useRemixesLineup({
    trackId: primaryTrackId,
    isContestEntry: true
  })

  const { mutateAsync: createEvent } = useCreateEvent()
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
  // Draft persistence
  // ---------------------------------------------------------------------------
  // Drafts only apply to the create flow — edit mode is driven by the
  // live event. Scope per user and per primary track (or "trackless" for
  // the /host-contest entry).
  const { existingDraft, saveDraft, clearDraft } = useContestDraft({
    userId: currentUserId,
    primaryTrackId,
    enabled: !isEdit
  })
  const [showDraftBanner, setShowDraftBanner] = useState(!!existingDraft)
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Form state
  // ---------------------------------------------------------------------------
  const [title, setTitle] = useState(existingEventData.title ?? '')
  const [description, setDescription] = useState(
    existingEventData.description ?? ''
  )
  const [descriptionError, setDescriptionError] = useState(false)
  const [videoUrl, setVideoUrl] = useState(existingEventData.videoUrl ?? '')
  const [showAttachVideoModal, setShowAttachVideoModal] = useState(false)
  const [coverPhotoUrl, setCoverPhotoUrl] = useState(
    existingEventData.coverPhotoUrl ?? ''
  )
  const [prizeInfo, setPrizeInfo] = useState(existingEventData.prizeInfo ?? '')

  const initialEndDate = remixContest ? dayjs(remixContest.endDate) : null
  const [contestEndDate, setContestEndDate] = useState<dayjs.Dayjs | null>(
    initialEndDate
  )
  const [endDateTouched, setEndDateTouched] = useState(false)
  const [endDateError, setEndDateError] = useState(false)
  const [timeValue, setTimeValue] = useState(
    initialEndDate ? dayjs(initialEndDate).format('hh:mm') : ''
  )
  const [timeError, setTimeError] = useState(false)
  const [meridianValue, setMeridianValue] = useState(
    initialEndDate ? dayjs(initialEndDate).format('A') : ''
  )

  const [sourceTrackIds, setSourceTrackIds] = useState<number[]>(
    existingEventData.sourceTrackIds ?? (primaryTrackId ? [primaryTrackId] : [])
  )

  // Hydrate form state once `remixContest` resolves.
  //
  // Why: `useState` initializers only run on first mount. On the edit route
  // the form mounts before the React Query fetch finishes, so the initial
  // state captures empty values and never picks up the resolved contest
  // data — Title, Description, Prizes, Video Link, etc. all rendered blank
  // even though the backend had them. Drafts are disabled in edit mode
  // (the useContestDraft hook is gated on `!isEdit`), so there's no
  // in-flight draft to worry about clobbering here.
  const hasHydratedRef = useRef(false)
  useEffect(() => {
    if (hasHydratedRef.current) return
    if (!remixContest) return
    const data = remixContest.eventData as ContestEventData
    if (data.title) setTitle(data.title)
    if (data.description) setDescription(data.description)
    if (data.videoUrl) setVideoUrl(data.videoUrl)
    if (data.coverPhotoUrl) setCoverPhotoUrl(data.coverPhotoUrl)
    if (data.prizeInfo) setPrizeInfo(data.prizeInfo)
    if (remixContest.endDate) {
      const d = dayjs(remixContest.endDate)
      setContestEndDate(d)
      setTimeValue(d.format('hh:mm'))
      setMeridianValue(d.format('A'))
    }
    if (data.sourceTrackIds && data.sourceTrackIds.length > 0) {
      setSourceTrackIds(data.sourceTrackIds)
    }
    hasHydratedRef.current = true
  }, [remixContest])

  // On the track-scoped route (/:handle/:slug/host-contest) the URL
  // identifies the source track, but `useTrackByPermalink` is async — by
  // the time it resolves, the `useState` initializer above has already
  // captured `primaryTrackId === undefined` and seeded `sourceTrackIds`
  // to `[]`. Without this sync, the Source Track section shows "+ Add
  // Track" instead of the URL's track and the Launch button stays
  // disabled forever (`sourceTrackIds.length === 0`), so clicking Launch
  // appears to do nothing. Run once when `primaryTrackId` first
  // resolves; skip if state was already populated from a draft or
  // existing contest, and never re-populate after a user removes the
  // row.
  const hasSeededPrimaryTrackRef = useRef(false)
  useEffect(() => {
    if (hasSeededPrimaryTrackRef.current) return
    if (!primaryTrackId) return
    hasSeededPrimaryTrackRef.current = true
    if (sourceTrackIds.length > 0) return
    setSourceTrackIds([primaryTrackId])
  }, [primaryTrackId, sourceTrackIds.length])

  // The event's backing track: prefer the URL-scoped primary track, and
  // fall back to the (required) first Source Track when entering from the
  // track-less /host-contest route. This is the `entity_id` on create /
  // update and drives the navigation target after save.
  const entityTrackId = primaryTrackId ?? sourceTrackIds[0]
  const { data: entityTrackPermalink } = useTrack(
    !primaryTrack ? (sourceTrackIds[0] ?? null) : null,
    { select: (t) => t?.permalink }
  )
  const effectivePermalink = primaryPermalink || entityTrackPermalink || ''

  // Modal state
  const [isAddTracksOpen, setIsAddTracksOpen] = useState(false)
  const [manageStemsTargetId, setManageStemsTargetId] = useState<number | null>(
    null
  )
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  // Debounced auto-save: while the user is editing in create mode, persist
  // the draft a couple of seconds after they stop typing. Skipped while the
  // restore banner is up (the user hasn't decided what to do with their
  // existing draft yet) and when the form is entirely empty (no point
  // overwriting an existing localStorage entry — discarding it should
  // mean discarded).
  const hasFormContent =
    !!title ||
    !!description ||
    !!videoUrl ||
    !!coverPhotoUrl ||
    !!prizeInfo ||
    !!contestEndDate ||
    sourceTrackIds.length > 0

  useEffect(() => {
    if (isEdit || showDraftBanner || !hasFormContent) return
    const timer = window.setTimeout(() => {
      saveDraft({
        title,
        description,
        videoUrl,
        coverPhotoUrl,
        prizeInfo,
        contestEndDate: contestEndDate?.toISOString(),
        timeValue,
        meridianValue,
        sourceTrackIds
      })
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [
    isEdit,
    showDraftBanner,
    hasFormContent,
    saveDraft,
    title,
    description,
    videoUrl,
    coverPhotoUrl,
    prizeInfo,
    contestEndDate,
    timeValue,
    meridianValue,
    sourceTrackIds
  ])

  // ---------------------------------------------------------------------------
  // Cover-photo upload + fallback to track artwork
  // ---------------------------------------------------------------------------
  const { imageUrl: trackArtworkUrl } = useTrackCoverArt({
    trackId: entityTrackId,
    size: SquareSizes.SIZE_1000_BY_1000
  })
  const resolvedCoverUrl = coverPhotoUrl || trackArtworkUrl
  const { upload: uploadCover, isUploading: isCoverUploading } =
    useUploadContestCover()
  const coverFileInputRef = useRef<HTMLInputElement>(null)
  const [coverUploadError, setCoverUploadError] = useState(false)

  const handleCoverFileSelected = useCallback(
    async (file: File | null) => {
      if (!file) return
      setCoverUploadError(false)
      const url = await uploadCover(file)
      if (url) {
        setCoverPhotoUrl(url)
      } else {
        setCoverUploadError(true)
      }
    },
    [uploadCover]
  )

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
    setIsAddTracksOpen(true)
  }, [])

  const handleRemoveSourceTrack = useCallback((id: number) => {
    setSourceTrackIds((prev) => prev.filter((x) => x !== id))
  }, [])

  const handleSourceTracksSelected = useCallback((ids: number[]) => {
    // Only one Source Track supported today — take the first new pick.
    setSourceTrackIds((prev) => {
      if (prev.length > 0) return prev
      return ids.slice(0, 1)
    })
  }, [])

  const handleRestoreDraft = useCallback(() => {
    if (!existingDraft) return
    if (existingDraft.title !== undefined) setTitle(existingDraft.title)
    if (existingDraft.description !== undefined) {
      setDescription(existingDraft.description)
    }
    if (existingDraft.videoUrl !== undefined) {
      setVideoUrl(existingDraft.videoUrl)
    }
    if (existingDraft.coverPhotoUrl !== undefined) {
      setCoverPhotoUrl(existingDraft.coverPhotoUrl)
    }
    if (existingDraft.prizeInfo !== undefined) {
      setPrizeInfo(existingDraft.prizeInfo)
    }
    if (existingDraft.contestEndDate) {
      setContestEndDate(dayjs(existingDraft.contestEndDate))
    }
    if (existingDraft.timeValue !== undefined) {
      setTimeValue(existingDraft.timeValue)
    }
    if (existingDraft.meridianValue !== undefined) {
      setMeridianValue(existingDraft.meridianValue)
    }
    if (existingDraft.sourceTrackIds !== undefined) {
      setSourceTrackIds(existingDraft.sourceTrackIds)
    }
    setShowDraftBanner(false)
  }, [existingDraft])

  const handleDiscardDraft = useCallback(() => {
    clearDraft()
    setShowDraftBanner(false)
  }, [clearDraft])

  const handleSaveDraft = useCallback(() => {
    saveDraft({
      title,
      description,
      videoUrl,
      coverPhotoUrl,
      prizeInfo,
      contestEndDate: contestEndDate?.toISOString(),
      timeValue,
      meridianValue,
      sourceTrackIds
    })
    setDraftSavedAt(new Date().toISOString())
    // After saving, the banner is no longer offering to restore — the
    // user is already working with that state.
    setShowDraftBanner(false)
  }, [
    saveDraft,
    title,
    description,
    videoUrl,
    coverPhotoUrl,
    prizeInfo,
    contestEndDate,
    timeValue,
    meridianValue,
    sourceTrackIds
  ])

  const handleCancel = useCallback(() => {
    clearDraft()
    // Track-less flow: fall back to the contests discovery page.
    if (!primaryPermalink) {
      navigate(CONTESTS_PAGE)
      return
    }
    navigate(isEdit ? contestPage(primaryPermalink) : primaryPermalink)
  }, [clearDraft, isEdit, navigate, primaryPermalink])

  const handleSubmit = useCallback(async () => {
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
    // entityTrackId is required on both track-scoped and track-less entry —
    // on track-less entry it comes from the (required) first Source Track.
    if (hasError || !entityTrackId || !currentUserId) return

    const endDate = parsedDate.toISOString()
    const eventData: ContestEventData = {
      description,
      prizeInfo,
      winners: existingEventData.winners ?? [],
      title: title.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      coverPhotoUrl: coverPhotoUrl.trim() || undefined,
      sourceTrackIds: sourceTrackIds.length > 0 ? sourceTrackIds : undefined
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
          trackId: entityTrackId
        })
      )
    } else {
      try {
        await createEvent({
          eventType: EventEventTypeEnum.RemixContest,
          entityType: EventEntityTypeEnum.Track,
          entityId: entityTrackId,
          eventData,
          endDate,
          userId: currentUserId
        })
      } catch {
        // Mutation's onError already surfaces a toast; stay on the form so
        // the user can retry instead of navigating to a half-created
        // contest page.
        return
      }

      track(
        make({
          eventName: Name.REMIX_CONTEST_CREATE,
          trackId: entityTrackId
        })
      )
    }

    clearDraft()
    if (effectivePermalink) {
      navigate(contestPage(effectivePermalink))
    } else {
      navigate(CONTESTS_PAGE)
    }
  }, [
    clearDraft,
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
    entityTrackId,
    currentUserId,
    isEdit,
    remixContest,
    updateEvent,
    createEvent,
    effectivePermalink,
    navigate
  ])

  const handleDeleteEvent = useCallback(() => {
    if (!remixContest || !currentUserId) return
    deleteEvent({ eventId: remixContest.eventId, userId: currentUserId })

    if (primaryTrackId) {
      track(
        make({
          eventName: Name.REMIX_CONTEST_DELETE,
          remixContestId: remixContest.eventId,
          trackId: primaryTrackId
        })
      )
    }
    clearDraft()
    if (primaryPermalink) {
      navigate(primaryPermalink)
    }
  }, [
    clearDraft,
    remixContest,
    currentUserId,
    deleteEvent,
    primaryTrackId,
    primaryPermalink,
    navigate
  ])

  // Track-scoped URL (/:handle/:slug/host-contest) but the track hasn't
  // resolved yet — avoid flashing an empty form against the wrong track.
  // Track-less entry (/host-contest) skips this and renders immediately.
  if (handle && slug && !primaryTrack) {
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

          {showDraftBanner && existingDraft ? (
            <Hint
              actions={
                <>
                  <Button
                    variant='primary'
                    size='small'
                    onClick={handleRestoreDraft}
                  >
                    {messages.restoreDraft}
                  </Button>
                  <Button
                    variant='secondary'
                    size='small'
                    onClick={handleDiscardDraft}
                  >
                    {messages.discardDraft}
                  </Button>
                </>
              }
            >
              {messages.draftRestoreTitle(
                dayjs(existingDraft.savedAt).format('MMM D, h:mm A')
              )}
            </Hint>
          ) : null}

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

          {/* Section: Video Link — uses the same AttachVideoModal as the
              fan-club composer so the validation + preview UX matches. */}
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
            <Flex direction='row' alignItems='center' gap='m'>
              {(() => {
                const parsed = videoUrl.trim()
                  ? parseVideoUrl(videoUrl.trim())
                  : null
                const thumbnail = parsed ? getVideoThumbnailUrl(parsed) : null
                return videoUrl && parsed ? (
                  <Flex
                    css={(theme) => ({
                      position: 'relative',
                      width: 102,
                      height: 56,
                      borderRadius: theme.cornerRadius.s,
                      overflow: 'hidden',
                      backgroundColor: theme.color.neutral.n800
                    })}
                  >
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=''
                        css={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : null}
                    <Flex
                      alignItems='center'
                      justifyContent='center'
                      css={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)'
                      }}
                    >
                      <IconPlay size='l' color='staticWhite' />
                    </Flex>
                    <Flex
                      alignItems='center'
                      justifyContent='center'
                      onClick={() => setVideoUrl('')}
                      css={(theme) => ({
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        width: 24,
                        height: 24,
                        borderRadius: theme.cornerRadius.circle,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0,0,0,0.7)'
                        }
                      })}
                    >
                      <IconClose size='xs' color='staticWhite' />
                    </Flex>
                  </Flex>
                ) : (
                  <PlainButton
                    type='button'
                    variant='default'
                    onClick={() => setShowAttachVideoModal(true)}
                  >
                    {messages.videoLabel}
                  </PlainButton>
                )
              })()}
            </Flex>
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
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.coverPhotoHelper}
              </Text>
            </Flex>
            <Box
              h={COVER_PHOTO_HEIGHT}
              onClick={() => coverFileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                const file = e.dataTransfer?.files?.[0]
                if (file) handleCoverFileSelected(file).catch(() => {})
              }}
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
                justifyContent: 'center',
                cursor: isCoverUploading ? 'wait' : 'pointer'
              }}
            >
              <Flex direction='column' alignItems='center' gap='s'>
                {isCoverUploading ? (
                  <LoadingSpinner />
                ) : (
                  <IconCloudUpload
                    size='2xl'
                    color={resolvedCoverUrl ? 'staticWhite' : 'subdued'}
                  />
                )}
                <Text
                  variant='body'
                  size='s'
                  color={resolvedCoverUrl ? 'staticWhite' : 'subdued'}
                >
                  {messages.coverPhotoPlaceholder}
                </Text>
              </Flex>
            </Box>
            <input
              ref={coverFileInputRef}
              type='file'
              accept='image/*'
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                handleCoverFileSelected(file).catch(() => {})
                // Reset so the same file can be re-selected after a mistake.
                e.target.value = ''
              }}
            />
            {coverUploadError ? (
              <Text variant='body' size='s' color='danger'>
                {messages.coverPhotoUploadFailed}
              </Text>
            ) : null}
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
            {/* For now only one Source Track is supported. Once one has
                been picked, Add Track is locked out — users can Remove the
                existing row to swap. (Upload-track-from-here is dropped for
                v1; will follow up alongside Save Draft in v2.) */}
            {sourceTrackIds.length === 0 ? (
              <Button
                variant='primary'
                fullWidth
                onClick={handleAddSourceTrack}
              >
                {messages.addTrack}
              </Button>
            ) : null}
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
                      onManageStems={() => setManageStemsTargetId(id)}
                      editReturnTo={
                        handle && slug
                          ? `/${handle}/${slug}/host-contest`
                          : '/host-contest'
                      }
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
                <Button
                  variant='destructive'
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  {messages.turnOff}
                </Button>
              ) : null}
              {/* Manual draft save: persists the full form to localStorage
                  for the current user + scope until the user discards it
                  or launches the contest. Hidden in edit mode since the
                  live event is the source of truth. */}
              {!isEdit ? (
                <Button variant='secondary' onClick={handleSaveDraft}>
                  {draftSavedAt ? messages.draftSaved : messages.saveDraft}
                </Button>
              ) : null}
              <Button
                variant='primary'
                onClick={handleSubmit}
                disabled={
                  !contestEndDate ||
                  endDateError ||
                  timeError ||
                  sourceTrackIds.length === 0
                }
              >
                {isEdit ? messages.save : messages.launch}
              </Button>
            </Flex>
          </Flex>
        </Flex>
      </Box>

      <AddSourceTrackModal
        isOpen={isAddTracksOpen}
        onClose={() => setIsAddTracksOpen(false)}
        initialSelectedIds={sourceTrackIds}
        onDone={handleSourceTracksSelected}
      />
      <ManageStemsModal
        isOpen={manageStemsTargetId !== null}
        onClose={() => setManageStemsTargetId(null)}
        trackId={manageStemsTargetId}
      />
      <AttachVideoModal
        isOpen={showAttachVideoModal}
        onClose={() => setShowAttachVideoModal(false)}
        onAttach={(url) => setVideoUrl(url)}
      />
      <ConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteEvent}
        destructive
        messages={{
          header: messages.deleteConfirmTitle,
          description: messages.deleteConfirmDescription,
          confirm: messages.deleteConfirm,
          cancel: messages.deleteCancel
        }}
      />
    </Page>
  )
}

// ----- Source-track row ------------------------------------------------------

type SourceTrackRowProps = {
  sourceTrackId: number
  onRemove: () => void
  onManageStems: () => void
  /**
   * Path the track-edit page should return to when the user clicks
   * Save / Back. Encoded into a `returnTo` query param so the in-flight
   * contest-creation form can be picked back up from its draft on landing.
   */
  editReturnTo: string
}

const SourceTrackRow = ({
  sourceTrackId,
  onRemove,
  onManageStems,
  editReturnTo
}: SourceTrackRowProps) => {
  const navigate = useNavigate()
  const { data: trackData } = useTrack(sourceTrackId, {
    select: (t) =>
      t
        ? {
            title: t.title,
            owner_id: t.owner_id,
            permalink: t.permalink,
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
  // getTrackStems is a fast one-shot query that returns the full stem
  // tracks; caching means subsequent rows hit the warm slot. Null when
  // the request hasn't resolved so we can distinguish "still loading"
  // from "actually 0 stems" if we want to.
  const { data: stems } = useStems(sourceTrackId)
  const stemsCount = stems?.length ?? 0

  // Label matches the Figma's three states: "X Stems" when there are
  // stems, "No Stems" otherwise. Until useStems resolves we render
  // nothing — avoids a flash of "No Stems" on tracks that turn out to
  // have stems.
  const stemsLabel =
    stems === undefined
      ? ''
      : stemsCount > 0
        ? messages.stemsCount(stemsCount)
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
                if (trackData?.permalink) navigate(trackData.permalink)
              }
            },
            {
              text: messages.editTrack,
              onClick: () => {
                if (trackData?.permalink) {
                  const target = `${trackData.permalink}/edit?returnTo=${encodeURIComponent(editReturnTo)}`
                  navigate(target)
                }
              }
            },
            {
              text: messages.manageStems,
              onClick: onManageStems
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
