import React, { useCallback, useEffect, useRef, useState } from 'react'

import { DownloadQuality, Name } from '@audius/common/models'
import type { TrackForUpload } from '@audius/common/store'
import {
  useWaitForDownloadModal,
  uploadActions,
  useReplaceTrackConfirmationModal,
  useReplaceTrackProgressModal,
  useEarlyReleaseConfirmationModal,
  useHideContentConfirmationModal,
  usePublishConfirmationModal
} from '@audius/common/store'
import { useField } from 'formik'
import { Keyboard } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { useDispatch } from 'react-redux'

import {
  IconCaretLeft,
  IconCloudUpload,
  Button,
  Flex
} from '@audius/harmony-native'
import { Tile } from 'app/components/core'
import { InputErrorMessage } from 'app/components/core/InputErrorMessage'
import { PriceAndAudienceField } from 'app/components/edit/PriceAndAudienceField'
import { VisibilityField } from 'app/components/edit/VisibilityField'
import { PickArtworkField, TextField } from 'app/components/fields'
import { useNavigation } from 'app/hooks/useNavigation'
import { useTrackFileSelector } from 'app/hooks/useTrackFileSelector'
import { FormScreen } from 'app/screens/form-screen'
import { make, track as trackEvent } from 'app/services/analytics'
import { setVisibility } from 'app/store/drawers/slice'
import { makeStyles } from 'app/styles'

import { TopBarIconButton } from '../app-screen'

import { EditTrackFormOverflowMenuDrawer } from './EditTrackFormOverflowMenuDrawer'
import { EditTrackFormPreviewContextProvider } from './EditTrackFormPreviewContext'
import { CancelEditTrackDrawer } from './components'
import { FileReplaceContainer } from './components/FileReplaceContainer'
import {
  SelectGenreField,
  DescriptionField,
  SelectMoodField,
  TagField,
  SubmenuList,
  RemixSettingsField,
  AdvancedField
} from './fields'
import type { EditTrackFormProps } from './types'
import { getUploadMetadataFromFormValues } from './util'

const { updateTrackAudio } = uploadActions

const messages = {
  trackName: 'Track Name',
  trackNameError: 'Track Name Required',
  fixErrors: 'Fix Errors To Continue',
  cancel: 'Cancel',
  untitled: 'Untitled'
}

const useStyles = makeStyles(({ spacing }) => ({
  backButton: {
    marginLeft: -6
  },
  tile: {
    margin: spacing(3)
  },
  errorText: {
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: spacing(4)
  }
}))

export type EditTrackParams = TrackForUpload

export const EditTrackForm = (props: EditTrackFormProps) => {
  const {
    handleSubmit: handleSubmitProp,
    initialValues,
    values,
    isUpload,
    isSubmitting,
    errors,
    touched,
    dirty,
    title,
    doneText
  } = props
  const errorsKeys = Object.keys(errors)
  const hasErrors =
    errorsKeys.length > 0 && errorsKeys.every((errorKey) => touched[errorKey])
  const styles = useStyles()
  const navigation = useNavigation()
  const dispatch = useDispatch()

  // Use track file selector directly like web version
  const { track: selectedTrack, selectFile } = useTrackFileSelector()

  const initiallyHidden = initialValues.is_unlisted
  const isInitiallyScheduled = initialValues.is_scheduled_release
  const usersMayLoseAccess = !isUpload && !initiallyHidden && values.is_unlisted
  const isToBePublished = !isUpload && initiallyHidden && !values.is_unlisted
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false)

  // Formik fields for managing track file state
  const [{ value: origFilename }, , { setValue: setOrigFilename }] =
    useField('orig_filename')
  const [{ value: streamUrl }] = useField('stream.url')
  const [, { touched: isTitleTouched }, { setValue: setTitle }] =
    useField('title')

  const originalOrigFilename = useRef<string | null>(null)
  const [selectedTrackFile, setSelectedTrackFile] = useState<string | null>(
    null
  )

  // Initialize the original track file reference
  useEffect(() => {
    if (origFilename && !originalOrigFilename.current) {
      originalOrigFilename.current = origFilename
    }
  }, [origFilename])

  const handleOverflowMenuOpen = useCallback(() => {
    setIsOverflowMenuOpen(true)
  }, [])
  const handleOverflowMenuClose = useCallback(() => {
    setIsOverflowMenuOpen(false)
  }, [])

  const { onOpen: openReplaceTrackConfirmation } =
    useReplaceTrackConfirmationModal()
  const { onOpen: openReplaceTrackProgress } = useReplaceTrackProgressModal()
  const { onOpen: openHideContentConfirmation } =
    useHideContentConfirmationModal()
  const { onOpen: openEarlyReleaseConfirmation } =
    useEarlyReleaseConfirmationModal()
  const { onOpen: openPublishConfirmation } = usePublishConfirmationModal()
  const { onOpen: openWaitForDownload } = useWaitForDownloadModal()

  const handleReplace = useCallback(() => {
    if (!selectFile) {
      console.warn(
        'Track replacement not available - selectFile function not found'
      )
      return
    }

    selectFile()

    // Track Replace event
    trackEvent(
      make({
        eventName: Name.TRACK_REPLACE_REPLACE,
        trackId: values.track_id,
        source: isUpload ? 'upload' : 'edit'
      })
    )
  }, [selectFile, isUpload, values.track_id])

  // Handle when a new track file is selected
  useEffect(() => {
    if (selectedTrack) {
      // Update form values with new track metadata
      // Only update title to file name if it's an upload AND user hasn't touched the title
      if (isUpload && !isTitleTouched) {
        setTitle(selectedTrack.metadata.title)
      }
      setOrigFilename(selectedTrack.metadata.orig_filename)

      // Handle both File and React Native file object types
      const fileUri =
        'uri' in selectedTrack.file
          ? selectedTrack.file.uri
          : selectedTrack.file.name
      setSelectedTrackFile(fileUri)

      // Track replace event
      trackEvent(
        make({
          eventName: Name.TRACK_REPLACE_REPLACE,
          trackId: values.track_id,
          source: isUpload ? 'upload' : 'edit'
        })
      )
    }
  }, [
    selectedTrack,
    setTitle,
    setOrigFilename,
    values.track_id,
    isUpload,
    isTitleTouched
  ])

  const handleDownload = useCallback(() => {
    if (!initialValues.track_id) {
      console.error('Cannot download track without track ID')
      return
    }

    openWaitForDownload({
      trackIds: [initialValues.track_id],
      quality: DownloadQuality.ORIGINAL
    })

    // Track Download event
    trackEvent(
      make({
        eventName: Name.TRACK_REPLACE_DOWNLOAD,
        trackId: initialValues.track_id
      })
    )
  }, [openWaitForDownload, initialValues.track_id])

  const handlePressBack = useCallback(() => {
    if (!dirty) {
      navigation.goBack()
    } else {
      Keyboard.dismiss()
      dispatch(
        setVisibility({
          drawer: 'CancelEditTrack',
          visible: true
        })
      )
    }
  }, [dirty, navigation, dispatch])

  const handleReplaceAudio = useCallback(() => {
    if (!selectedTrack || !values.track_id) {
      console.warn(
        'Track replacement not available - missing track or track ID'
      )
      return
    }

    const metadata = getUploadMetadataFromFormValues(values, initialValues)

    dispatch(
      updateTrackAudio({
        trackId: values.track_id,
        file: selectedTrack.file,
        metadata
      })
    )
    openReplaceTrackProgress()
    navigation.navigate('Track', { trackId: values.track_id })
  }, [
    dispatch,
    initialValues,
    navigation,
    openReplaceTrackProgress,
    selectedTrack,
    values
  ])

  const handleSubmit = useCallback(() => {
    Keyboard.dismiss()
    // Check if a new file has been selected (either in upload or edit flow)
    const isFileReplaced =
      selectedTrackFile && selectedTrackFile !== originalOrigFilename.current

    if (isFileReplaced) {
      openReplaceTrackConfirmation({ confirmCallback: handleReplaceAudio })
    } else if (usersMayLoseAccess) {
      openHideContentConfirmation({ confirmCallback: handleSubmitProp })
    } else if (isToBePublished && isInitiallyScheduled) {
      openEarlyReleaseConfirmation({
        contentType: 'track',
        confirmCallback: handleSubmitProp
      })
    } else if (isToBePublished) {
      openPublishConfirmation({
        contentType: 'track',
        confirmCallback: handleSubmitProp
      })
    } else {
      handleSubmitProp()
    }
  }, [
    selectedTrackFile,
    originalOrigFilename,
    usersMayLoseAccess,
    isToBePublished,
    isInitiallyScheduled,
    openReplaceTrackConfirmation,
    handleReplaceAudio,
    openHideContentConfirmation,
    handleSubmitProp,
    openEarlyReleaseConfirmation,
    openPublishConfirmation
  ])

  return (
    <>
      <EditTrackFormPreviewContextProvider>
        <FormScreen
          title={title}
          icon={IconCloudUpload}
          topbarLeft={
            <TopBarIconButton
              icon={IconCaretLeft}
              style={styles.backButton}
              onPress={handlePressBack}
            />
          }
          bottomSection={
            <>
              {hasErrors ? (
                <InputErrorMessage
                  message={messages.fixErrors}
                  style={styles.errorText}
                />
              ) : null}
              <Flex direction='row' gap='s'>
                <Button fullWidth variant='secondary' onPress={handlePressBack}>
                  {messages.cancel}
                </Button>
                <Button
                  variant='primary'
                  fullWidth
                  onPress={handleSubmit}
                  disabled={isSubmitting || hasErrors}
                >
                  {doneText}
                </Button>
              </Flex>
            </>
          }
        >
          <>
            <KeyboardAwareScrollView>
              <Tile style={styles.tile}>
                <Flex pt='l' ph='l'>
                  <FileReplaceContainer
                    fileName={
                      selectedTrack?.file.name ||
                      origFilename ||
                      values.title ||
                      messages.untitled
                    }
                    // @ts-ignore
                    filePath={selectedTrackFile || streamUrl || ''}
                    trackId={values.track_id}
                    isUpload={isUpload}
                    onMenuButtonPress={handleOverflowMenuOpen}
                  />
                </Flex>
                <PickArtworkField name='artwork' isUpload={isUpload} />
                <TextField name='title' label={messages.trackName} required />
                <SubmenuList>
                  <SelectGenreField />
                  <SelectMoodField />
                </SubmenuList>
                <TagField />
                <DescriptionField />
                <SubmenuList removeBottomDivider>
                  <VisibilityField />
                  <PriceAndAudienceField />
                  <RemixSettingsField />
                  <AdvancedField />
                </SubmenuList>
              </Tile>
            </KeyboardAwareScrollView>
          </>
        </FormScreen>
      </EditTrackFormPreviewContextProvider>
      <CancelEditTrackDrawer />
      <EditTrackFormOverflowMenuDrawer
        isOpen={isOverflowMenuOpen}
        onClose={handleOverflowMenuClose}
        onReplace={handleReplace}
        onDownload={!isUpload ? handleDownload : undefined}
      />
    </>
  )
}
