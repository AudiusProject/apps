import { useCallback, useMemo, useState } from 'react'

import {
  useCreateEvent,
  useCurrentUserId,
  useDeleteEvent,
  useRemixContest,
  useRemixesLineup,
  useUpdateEvent
} from '@audius/common/api'
import { remixMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { useHostRemixContestModal } from '@audius/common/store'
import { dayjs } from '@audius/common/utils'
import {
  Button,
  Divider,
  Flex,
  IconTrophy,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  Select,
  Text,
  TextLink,
  TextArea
} from '@audius/harmony'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk'

import { DatePicker } from 'components/edit/fields/DatePickerField'
import { mergeReleaseDateValues } from 'components/edit/fields/visibility/mergeReleaseDateValues'
import { track, make } from 'services/analytics'

import { TimeInput, parseTime } from './TimeInput'

const contestHostingLink =
  'https://help.audius.co/artists/hosting-a-remix-contest'

export const HostRemixContestModal = () => {
  const { data, isOpen, onClose, onClosed } = useHostRemixContestModal()
  const { trackId } = data
  const { mutate: createEvent } = useCreateEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: deleteEvent } = useDeleteEvent()
  const { data: userId } = useCurrentUserId()
  const { data: remixes, isLoading: remixesLoading } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })
  const { data: remixContest } = useRemixContest(trackId)
  const isEdit = !!remixContest
  const hasContestEntries = remixesLoading || remixes?.length
  const displayTurnOffButton = !hasContestEntries && isEdit
  const contestMinDate = useMemo(
    () => (remixContest ? dayjs(remixContest.endDate) : dayjs()),
    [remixContest]
  )

  const remixContestData = remixContest?.eventData

  // Form state
  const [contestDescription, setContestDescription] = useState(
    remixContestData ? remixContestData.description : ''
  )
  const [contestPrizeInfo, setContestPrizeInfo] = useState(
    remixContestData ? remixContestData.prizeInfo : ''
  )
  const [contestEndDate, setContestEndDate] = useState(
    remixContest ? dayjs(remixContest.endDate) : null
  )
  const [endDateTouched, setEndDateTouched] = useState(false)
  const [endDateError, setEndDateError] = useState(false)
  const [descriptionError, setDescriptionError] = useState(false)
  const [timeValue, setTimeValue] = useState(
    contestEndDate ? dayjs(contestEndDate).format('hh:mm') : ''
  )
  const [timeError, setTimeError] = useState(false)
  const [meridianValue, setMeridianValue] = useState(
    contestEndDate ? dayjs(contestEndDate).format('A') : ''
  )

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

  const handleSubmit = useCallback(() => {
    const parsedTime = parseTime(timeValue)
    if (!parsedTime) return

    const parsedDate = mergeReleaseDateValues(
      contestEndDate?.toISOString() ?? '',
      parsedTime,
      meridianValue
    )

    const hasDescriptionError = !contestDescription
    const hasDateError =
      !parsedDate ||
      dayjs(parsedDate.toISOString()).isBefore(contestMinDate) ||
      dayjs(parsedDate.toISOString()).isAfter(dayjs().add(90, 'days'))
    const hasError = hasDateError || hasDescriptionError

    setEndDateTouched(true)
    setEndDateError(hasDateError)
    setDescriptionError(hasDescriptionError)
    if (hasError || !trackId || !userId) return

    const endDate = parsedDate.toISOString()
    const eventData = {
      description: contestDescription,
      prizeInfo: contestPrizeInfo,
      winners: remixContest?.eventData.winners ?? []
    }

    if (isEdit) {
      updateEvent({
        eventId: remixContest.eventId,
        eventData,
        endDate,
        userId
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
        userId
      })

      track(
        make({
          eventName: Name.REMIX_CONTEST_CREATE,
          trackId
        })
      )
    }

    onClose()
  }, [
    timeValue,
    contestEndDate,
    meridianValue,
    contestDescription,
    contestMinDate,
    trackId,
    userId,
    contestPrizeInfo,
    remixContest?.eventData.winners,
    remixContest?.eventId,
    isEdit,
    onClose,
    updateEvent,
    createEvent
  ])

  const handleDeleteEvent = useCallback(() => {
    if (!remixContest || !userId) return
    deleteEvent({ eventId: remixContest.eventId, userId })

    if (trackId) {
      track(
        make({
          eventName: Name.REMIX_CONTEST_DELETE,
          remixContestId: remixContest.eventId,
          trackId
        })
      )
    }
    onClose()
  }, [remixContest, userId, deleteEvent, onClose, trackId])

  return (
    <Modal isOpen={isOpen} onClose={onClose} onClosed={onClosed} size='medium'>
      <ModalHeader onClose={onClose}>
        <ModalTitle Icon={IconTrophy} title={remixMessages.modalTitle} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='xl'>
          <Text variant='body'>{remixMessages.modalDescription}</Text>
          <Flex direction='column' gap='l'>
            <Text
              variant='title'
              size='l'
              tag='label'
              htmlFor='contestDescription'
            >
              {remixMessages.descriptionLabel}
            </Text>
            <TextArea
              id='contestDescription'
              aria-label='contestDescription'
              placeholder={remixMessages.descriptionPlaceholder}
              maxLength={1000}
              value={contestDescription}
              error={descriptionError}
              helperText={
                descriptionError ? remixMessages.descriptionError : undefined
              }
              onChange={(e) => setContestDescription(e.target.value)}
              css={{ minHeight: 144, maxHeight: 300 }}
              showMaxLength
            />
            <TextLink variant='visible' href={contestHostingLink} isExternal>
              {remixMessages.contestHostingLabel}
            </TextLink>
          </Flex>
          <Divider color='default' />
          <Flex direction='column' gap='l'>
            <Text
              variant='title'
              size='l'
              tag='label'
              htmlFor='contestPrizeInfo'
            >
              {remixMessages.prizeInfoLabel}
            </Text>
            <TextArea
              id='contestPrizeInfo'
              aria-label='contestPrizeInfo'
              placeholder={remixMessages.prizeInfoPlaceholder}
              maxLength={1000}
              css={{ minHeight: 144, maxHeight: 300 }}
              showMaxLength
              value={contestPrizeInfo}
              onChange={(e) => setContestPrizeInfo(e.target.value)}
            />
          </Flex>
          <Divider color='default' />
          <Flex direction='column' gap='l'>
            <Text variant='title' size='l'>
              {remixMessages.endDateLabel}
            </Text>
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
            <Flex gap='l'>
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
          </Flex>
          <Flex gap='l' justifyContent='center'>
            {displayTurnOffButton ? (
              <Button
                variant='secondary'
                onClick={handleDeleteEvent}
                fullWidth={displayTurnOffButton}
              >
                {remixMessages.turnOff}
              </Button>
            ) : null}
            <Button
              variant='primary'
              onClick={handleSubmit}
              disabled={!contestEndDate || endDateError || timeError}
              fullWidth={displayTurnOffButton}
            >
              {isEdit ? remixMessages.save : remixMessages.startContest}
            </Button>
          </Flex>
        </Flex>
      </ModalContent>
    </Modal>
  )
}
