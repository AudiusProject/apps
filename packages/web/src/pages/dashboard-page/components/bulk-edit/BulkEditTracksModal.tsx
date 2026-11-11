import { useCallback, useState } from 'react'

import { fileToSdk } from '@audius/common/adapters'
import {
  BULK_EDIT_MAX_TAGS,
  BulkTrackEdit,
  BulkUpdateTracksResult,
  hasBulkTrackEdit,
  useBulkUpdateTracks
} from '@audius/common/api'
import { useUSDCPurchaseConfig } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { toastActions } from '@audius/common/store'
import { getErrorMessage, removeNullable } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import {
  Button,
  Flex,
  Hint,
  IconPencil,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Text
} from '@audius/harmony'
import { Form, Formik, FormikErrors, useFormikContext } from 'formik'
import { useDispatch } from 'react-redux'

import { SelectGenreField } from 'components/edit/fields/SelectGenreField'
import { SelectMoodField } from 'components/edit/fields/SelectMoodField'
import { TagField } from 'components/form-fields'
import { PriceField } from 'components/form-fields/PriceField'
import { SegmentedControlField } from 'components/form-fields/SegmentedControlField'
import UploadArtwork from 'components/upload/UploadArtwork'
import { resizeImage } from 'utils/imageProcessingUtil'

const { toast } = toastActions

const pluralize = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

const messages = {
  title: (count: number) => `Edit ${pluralize(count, 'Track')}`,
  description:
    'Changes apply to every selected track. Fields you leave empty stay as they are.',
  artwork: 'Artwork',
  details: 'Details',
  tags: 'Tags',
  tagsAdd: 'Add to existing',
  tagsReplace: 'Replace existing',
  price: 'Price',
  priceKeep: 'Keep current',
  priceSet: 'Set price',
  priceFree: 'Make free',
  priceLabel: 'Price per track',
  premiumHint:
    'Fans pay once to unlock each track, and buyers can download it. Remixes can’t be sold and keep their current access.',
  freeHint:
    'Removes the price from premium tracks and turns off their downloads. Tracks with follower or coin access keep it.',
  priceRequired: 'Enter a price.',
  priceTooLow: (minCents: number) =>
    `Price must be at least ${USDC(minCents / 100).toLocaleString()}.`,
  priceTooHigh: (maxCents: number) =>
    `Price must be less than ${USDC(maxCents / 100).toLocaleString()}.`,
  cancel: 'Cancel',
  submit: (count: number) => `Update ${pluralize(count, 'Track')}`,
  uploadingArtwork: 'Uploading artwork',
  progress: (completed: number, total: number) =>
    `Updating ${completed} of ${total}`,
  done: 'Done',
  toastUpdated: (count: number) => `Updated ${pluralize(count, 'track')}`,
  toastUnchanged: 'No changes to save',
  resultTitle: 'Edit Finished',
  resultUpdated: (count: number) => `${pluralize(count, 'track')} updated.`,
  resultRemix: 'Remixes can’t be sold, so these kept their current access:',
  resultSpecialAccess:
    'These have follower or coin access, so their access was left alone:',
  resultFailed: 'These couldn’t be updated. Try them again:',
  error: 'Something went wrong. Please try again.'
}

type PriceType = 'keep' | 'premium' | 'free'

type BulkEditFormValues = {
  artwork: { url: string; file: File } | null
  genre: string
  mood: string | null
  tags: string
  tagsMode: 'add' | 'replace'
  priceType: PriceType
  price: number | undefined
}

const initialValues: BulkEditFormValues = {
  artwork: null,
  genre: '',
  mood: null,
  tags: '',
  tagsMode: 'add',
  priceType: 'keep',
  price: undefined
}

const tagsModeOptions = [
  { key: 'add', text: messages.tagsAdd },
  { key: 'replace', text: messages.tagsReplace }
]

const priceTypeOptions = [
  { key: 'keep', text: messages.priceKeep },
  { key: 'premium', text: messages.priceSet },
  { key: 'free', text: messages.priceFree }
]

const toEdit = (values: BulkEditFormValues): BulkTrackEdit => {
  const tags = values.tags.split(',').filter(Boolean)
  return {
    genre: values.genre.trim() || undefined,
    mood: values.mood || undefined,
    tags: tags.length ? { mode: values.tagsMode, values: tags } : undefined,
    price:
      values.priceType === 'premium' && values.price
        ? { type: 'premium', priceCents: Math.round(values.price) }
        : values.priceType === 'free'
          ? { type: 'free' }
          : undefined
  }
}

const SectionLabel = ({ children }: { children: string }) => (
  <Text variant='title' size='l'>
    {children}
  </Text>
)

const BulkEditFields = () => {
  const { values, setFieldValue } = useFormikContext<BulkEditFormValues>()
  const [imageProcessingError, setImageProcessingError] = useState(false)

  const handleDropArtwork = useCallback(
    async (selectedFiles: File[]) => {
      try {
        const file = await resizeImage(selectedFiles[0])
        setFieldValue('artwork', { url: URL.createObjectURL(file), file })
        setImageProcessingError(false)
      } catch (err) {
        console.error(getErrorMessage(err))
        setImageProcessingError(true)
      }
    },
    [setFieldValue]
  )

  const handleRemoveArtwork = useCallback(() => {
    setFieldValue('artwork', null)
  }, [setFieldValue])

  return (
    <Flex direction='column' gap='xl'>
      <Text variant='body' color='subdued'>
        {messages.description}
      </Text>
      <Flex gap='l'>
        <UploadArtwork
          size='small'
          artworkUrl={values.artwork?.url}
          onDropArtwork={handleDropArtwork}
          onRemoveArtwork={handleRemoveArtwork}
          imageProcessingError={imageProcessingError}
        />
        <Flex direction='column' gap='l' flex={1} css={{ minWidth: 0 }}>
          <SelectGenreField name='genre' required={false} />
          <SelectMoodField name='mood' />
          <TagField name='tags' maxTags={BULK_EDIT_MAX_TAGS} />
          {values.tags ? (
            <SegmentedControlField
              name='tagsMode'
              label={messages.tags}
              options={tagsModeOptions}
              fullWidth
            />
          ) : null}
        </Flex>
      </Flex>
      <Flex direction='column' gap='l'>
        <SectionLabel>{messages.price}</SectionLabel>
        <SegmentedControlField
          name='priceType'
          label={messages.price}
          options={priceTypeOptions}
          fullWidth
        />
        {values.priceType === 'premium' ? (
          <>
            <PriceField
              name='price'
              label={messages.priceLabel}
              placeholder='1.00'
            />
            <Hint>{messages.premiumHint}</Hint>
          </>
        ) : null}
        {values.priceType === 'free' ? <Hint>{messages.freeHint}</Hint> : null}
      </Flex>
    </Flex>
  )
}

type TrackSummary = { track_id: ID; title: string }

type ResultViewProps = {
  result: BulkUpdateTracksResult
  tracks: TrackSummary[]
}

const TrackTitleList = ({
  label,
  trackIds,
  tracks
}: {
  label: string
  trackIds: ID[]
  tracks: TrackSummary[]
}) => {
  if (!trackIds.length) return null
  const titles = trackIds
    .map((id) => tracks.find((track) => track.track_id === id)?.title)
    .filter(removeNullable)
  return (
    <Flex direction='column' gap='xs'>
      <Text variant='body' strength='strong'>
        {label}
      </Text>
      {titles.map((title, i) => (
        <Text key={`${title}-${i}`} variant='body' color='subdued' ellipses>
          {title}
        </Text>
      ))}
    </Flex>
  )
}

const ResultView = ({ result, tracks }: ResultViewProps) => {
  const idsFor = (reason: 'remix' | 'special_access') =>
    result.priceSkipped
      .filter((skipped) => skipped.reason === reason)
      .map((skipped) => skipped.trackId)

  return (
    <Flex direction='column' gap='l'>
      <Text variant='body'>
        {messages.resultUpdated(result.updated.length)}
      </Text>
      <TrackTitleList
        label={messages.resultRemix}
        trackIds={idsFor('remix')}
        tracks={tracks}
      />
      <TrackTitleList
        label={messages.resultSpecialAccess}
        trackIds={idsFor('special_access')}
        tracks={tracks}
      />
      <TrackTitleList
        label={messages.resultFailed}
        trackIds={result.failed}
        tracks={tracks}
      />
    </Flex>
  )
}

type BulkEditTracksModalProps = {
  isOpen: boolean
  onClose: () => void
  /** Called once any track was updated, so the caller can clear selection. */
  onUpdated: () => void
  tracks: TrackSummary[]
}

export const BulkEditTracksModal = (props: BulkEditTracksModalProps) => {
  const { isOpen, onClose, onUpdated, tracks } = props
  const dispatch = useDispatch()
  const { minContentPriceCents, maxContentPriceCents } = useUSDCPurchaseConfig()
  const { mutateAsync: bulkUpdateTracks, isPending } = useBulkUpdateTracks()
  const [progress, setProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  // Keeps the edited tracks for the result view after selection clears.
  const [result, setResult] = useState<{
    result: BulkUpdateTracksResult
    tracks: TrackSummary[]
  } | null>(null)
  const count = tracks.length

  const handleClose = useCallback(() => {
    if (!isPending) onClose()
  }, [isPending, onClose])

  const handleClosed = useCallback(() => {
    setResult(null)
    setProgress(null)
  }, [])

  const validate = useCallback(
    (values: BulkEditFormValues) => {
      const errors: FormikErrors<BulkEditFormValues> = {}
      if (values.priceType === 'premium') {
        if (!values.price) {
          errors.price = messages.priceRequired
        } else if (values.price < minContentPriceCents) {
          errors.price = messages.priceTooLow(minContentPriceCents)
        } else if (values.price > maxContentPriceCents) {
          errors.price = messages.priceTooHigh(maxContentPriceCents)
        }
      }
      return errors
    },
    [minContentPriceCents, maxContentPriceCents]
  )

  const handleSubmit = useCallback(
    async (values: BulkEditFormValues) => {
      setProgress(null)
      try {
        const result = await bulkUpdateTracks({
          trackIds: tracks.map((track) => track.track_id),
          edit: toEdit(values),
          imageFile: values.artwork
            ? fileToSdk(values.artwork.file, 'cover_art')
            : undefined,
          onProgress: (completed, total) => setProgress({ completed, total })
        })
        if (result.updated.length) {
          onUpdated()
        }
        if (result.failed.length || result.priceSkipped.length) {
          setResult({ result, tracks })
          return
        }
        dispatch(
          toast({
            content: result.updated.length
              ? messages.toastUpdated(result.updated.length)
              : messages.toastUnchanged
          })
        )
        onClose()
      } catch (error) {
        console.error(error)
        dispatch(toast({ content: messages.error }))
      }
    },
    [bulkUpdateTracks, dispatch, onClose, onUpdated, tracks]
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={handleClosed}
      dismissOnClickOutside={!isPending}
      size='medium'
    >
      <ModalHeader>
        <ModalTitle
          Icon={IconPencil}
          title={result ? messages.resultTitle : messages.title(count)}
        />
      </ModalHeader>
      {result ? (
        <>
          <ModalContent>
            <ResultView result={result.result} tracks={result.tracks} />
          </ModalContent>
          <ModalFooter>
            <Button variant='primary' onClick={handleClose} fullWidth>
              {messages.done}
            </Button>
          </ModalFooter>
        </>
      ) : (
        <Formik
          initialValues={initialValues}
          validate={validate}
          onSubmit={handleSubmit}
        >
          {({ values, isSubmitting }) => {
            const hasChanges =
              !!values.artwork || hasBulkTrackEdit(toEdit(values))
            return (
              <Form>
                <ModalContent>
                  <BulkEditFields />
                </ModalContent>
                <ModalFooter>
                  <Button
                    variant='secondary'
                    onClick={handleClose}
                    disabled={isSubmitting}
                    fullWidth
                  >
                    {messages.cancel}
                  </Button>
                  <Button
                    variant='primary'
                    type='submit'
                    disabled={!hasChanges}
                    isLoading={isSubmitting}
                    fullWidth
                  >
                    {isSubmitting
                      ? progress
                        ? messages.progress(progress.completed, progress.total)
                        : values.artwork
                          ? messages.uploadingArtwork
                          : messages.progress(0, count)
                      : messages.submit(count)}
                  </Button>
                </ModalFooter>
              </Form>
            )
          }}
        </Formik>
      )}
    </Modal>
  )
}
