import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useCreateEvent,
  useRemixContest,
  useUpdateEvent,
  useDeleteEvent,
  useRemixesLineup
} from '@audius/common/api'
import { remixMessages } from '@audius/common/messages'
import { Name } from '@audius/common/models'
import { useHostRemixContestModal } from '@audius/common/store'
import { EventEntityTypeEnum, EventEventTypeEnum } from '@audius/sdk/services'
import dayjs from 'dayjs'
import { Platform, ScrollView } from 'react-native'

import {
  Flex,
  Text,
  IconTrophy,
  IconCalendarMonth,
  Button,
  TextLink
} from '@audius/harmony-native'
import { make, track } from 'app/services/analytics'
import { makeStyles } from 'app/styles'

import { DateTimeInput, TextInput } from '../core'
import { AppDrawer } from '../drawer'

const MODAL_NAME = 'HostRemixContest'

const maxDescriptionLength = 1000
const maxPrizeInfoLength = 1000
const hostContestUrl = 'https://help.audius.co/artists/hosting-a-remix-contest'

const mergeDateTime = (day: string, time: string) => {
  const truncatedReleaseDate = dayjs(day).startOf('day')
  const parsedTime = dayjs(time)
  const hour = parsedTime.get('hour')
  const minute = parsedTime.get('minute')

  const combinedDateTime = truncatedReleaseDate
    .add(hour, 'hours')
    .add(minute, 'minutes')

  return combinedDateTime
}

const useStyles = makeStyles(({ typography }) => ({
  input: {
    height: 144,
    textAlignVertical: 'top',
    fontSize: typography.fontSize.large,
    lineHeight:
      Platform.OS === 'ios' ? typography.fontSize.xl : typography.fontSize.large
  },
  labelText: {
    fontSize: typography.fontSize.large,
    fontFamily: typography.fontByWeight.demiBold,
    top: 4
  }
}))

export const HostRemixContestDrawer = () => {
  const { data, onClose } = useHostRemixContestModal()
  const { mutate: createEvent } = useCreateEvent()
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const styles = useStyles()
  const { data: userId } = useCurrentUserId()
  const { trackId } = data
  const { data: remixContest } = useRemixContest(trackId)
  const { data: remixes, isLoading: remixesLoading } = useRemixesLineup({
    trackId,
    isContestEntry: true
  })
  const isEdit = !!remixContest
  const hasContestEntries = remixesLoading || remixes?.length
  const displayTurnOffButton = !hasContestEntries && isEdit
  const contestMinDate = useMemo(
    () => (remixContest ? dayjs(remixContest.endDate) : dayjs()),
    [remixContest]
  )

  const remixContestData = remixContest?.eventData

  // Form State
  const [description, setDescription] = useState(
    remixContestData ? remixContestData.description : ''
  )
  const [descriptionError, setDescriptionError] = useState<boolean>(false)
  const [prizeInfo, setPrizeInfo] = useState(
    remixContestData ? remixContestData.prizeInfo : ''
  )
  const [endDate, setEndDate] = useState(
    remixContest ? dayjs(remixContest.endDate) : null
  )
  const [endDateError, setEndDateError] = useState<boolean>(false)

  const handleChange = useCallback(
    (date: string, time: string) => {
      if (!date && !time) {
        setEndDate(null)
        return
      }

      const newDate = mergeDateTime(date || time, time || date)
      if (newDate.isBefore(contestMinDate)) {
        setEndDateError(true)
      } else {
        setEndDateError(false)
      }
      setEndDate(newDate)
    },
    [contestMinDate]
  )

  const handleDateChange = useCallback(
    (date: string) => {
      handleChange(date, endDate?.toString() ?? '')
    },
    [endDate, handleChange]
  )

  const handleTimeChange = useCallback(
    (time: string) => {
      handleChange(endDate?.toString() ?? '', time)
    },
    [endDate, handleChange]
  )

  const handleSubmit = useCallback(() => {
    setDescriptionError(description.length === 0)

    if (endDateError || descriptionError || !trackId || !userId || !endDate) {
      return
    }

    if (isEdit) {
      updateEvent({
        eventId: remixContest.eventId,
        endDate: endDate.toISOString(),
        eventData: {
          description,
          prizeInfo,
          winners: remixContest.eventData.winners ?? []
        },
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
        endDate: endDate.toISOString(),
        userId,
        eventData: {
          description,
          prizeInfo,
          winners: []
        }
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
    description,
    endDateError,
    descriptionError,
    trackId,
    userId,
    endDate,
    isEdit,
    onClose,
    updateEvent,
    remixContest?.eventId,
    remixContest?.eventData.winners,
    prizeInfo,
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
    <AppDrawer
      modalName={MODAL_NAME}
      isFullscreen
      onClose={onClose}
      isGestureSupported={false}
      title={remixMessages.modalTitle}
      titleIcon={IconTrophy}
    >
      <ScrollView>
        <Flex h='100%' justifyContent='space-between'>
          <Flex pv='xl' ph='l' gap='xl'>
            <Text variant='body'>{remixMessages.modalDescription}</Text>
            <Flex column gap='l'>
              <Text variant='title' size='l'>
                {remixMessages.descriptionLabel}
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={remixMessages.descriptionPlaceholder}
                multiline
                numberOfLines={5}
                error={descriptionError}
                styles={{
                  input: styles.input,
                  labelText: styles.labelText
                }}
                maxLength={maxDescriptionLength}
              />
              <TextLink url={hostContestUrl} variant='visible'>
                {remixMessages.contestHostingLabel}
              </TextLink>
            </Flex>
            <Flex column gap='l'>
              <Text variant='title' size='l'>
                {remixMessages.prizeInfoLabel}
              </Text>
              <TextInput
                value={prizeInfo}
                onChangeText={setPrizeInfo}
                placeholder={remixMessages.prizeInfoPlaceholder}
                multiline
                numberOfLines={5}
                styles={{
                  input: styles.input,
                  labelText: styles.labelText
                }}
                maxLength={maxPrizeInfoLength}
              />
            </Flex>
            <Flex column gap='l'>
              <Text variant='title' size='l'>
                {remixMessages.endDateLabel}
              </Text>
              <DateTimeInput
                mode='date'
                date={endDate?.toString() ?? ''}
                onChange={handleDateChange}
                dateTimeProps={{
                  minimumDate: contestMinDate.toDate(),
                  maximumDate: dayjs().add(90, 'days').toDate()
                }}
                inputProps={{
                  label: remixMessages.endDateLabel,
                  startIcon: IconCalendarMonth,
                  error: !!endDateError,
                  helperText: endDateError ? remixMessages.endDateError : ''
                }}
              />
              <DateTimeInput
                mode='time'
                date={endDate?.toString() ?? ''}
                onChange={handleTimeChange}
                inputProps={{ label: remixMessages.timeLabel }}
              />
            </Flex>
          </Flex>
        </Flex>
      </ScrollView>
      <Flex direction='column' gap='l' p='l' pb='3xl' borderTop='strong'>
        <Button
          disabled={!endDate || !description || endDateError}
          variant='primary'
          fullWidth
          onPress={handleSubmit}
        >
          {isEdit ? remixMessages.save : remixMessages.startContest}
        </Button>
        {displayTurnOffButton ? (
          <Button variant='secondary' fullWidth onPress={handleDeleteEvent}>
            {remixMessages.turnOff}
          </Button>
        ) : null}
      </Flex>
    </AppDrawer>
  )
}
