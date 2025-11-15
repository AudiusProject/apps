import { useMemo, useRef, useState } from 'react'

import { useCurrentAccountUser } from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { ErrorLevel, Feature, LaunchpadFormValues } from '@audius/common/models'
import { route } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconCloudUpload,
  LoadingSpinner,
  Paper,
  PlainButton,
  Text,
  useTheme
} from '@audius/harmony'
import { useFormikContext } from 'formik'
import ReactDropzone from 'react-dropzone'

import { ExternalTextLink } from 'components/link'
import { useFormImageUrl } from 'hooks/useFormImageUrl'
import { reportToSentry } from 'store/errors/reportToSentry'
import {
  resizeImage,
  ALLOWED_IMAGE_FILE_TYPES
} from 'utils/imageProcessingUtil'

import { ArtistCoinsSubmitRow } from '../components/ArtistCoinsSubmitRow'
import { CoinFormFields } from '../components/CoinFormFields'
import { ImageUploadArea } from '../components/ImageUploadArea'
import type { PhasePageProps } from '../components/types'
import { AMOUNT_OF_STEPS, MAX_IMAGE_SIZE } from '../constants'
import { getDefaultBannerImageUrl, useLaunchpadAnalytics } from '../utils'

const messages = {
  stepInfo: `STEP 1 of ${AMOUNT_OF_STEPS}`,
  title: 'Set Up Your Coin',
  description:
    'The Coin Name, Ticker Symbol, and Image cannot be changed once launched. Make sure you have the rights',
  rightsLinkText: 'to use the Coin Name, Ticker Symbol, and Image',
  errors: {
    invalidFileType: 'Please select a JPEG, PNG, or WebP image file',
    fileTooLarge: 'File size must be less than 15MB',
    processingError: 'Unable to process this file. Please try another image.'
  }
}

const bannerMessages = {
  title: coinDetailsMessages.editCoinDetails.bannerImage,
  description: coinDetailsMessages.editCoinDetails.bannerDescription,
  dragDrop: coinDetailsMessages.editCoinDetails.bannerDragDrop,
  upload: coinDetailsMessages.editCoinDetails.bannerUpload,
  change: coinDetailsMessages.editCoinDetails.bannerChange,
  remove: coinDetailsMessages.editCoinDetails.bannerRemove,
  emptyState: coinDetailsMessages.editCoinDetails.bannerEmptyState,
  errors: coinDetailsMessages.editCoinDetails.bannerErrors
}

type BannerUploadAreaProps = {
  fileInputRef: React.RefObject<HTMLInputElement>
  previewUrl: string | null
  onFileInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onFileSelect: () => void
  onDropAccepted: (files: File[]) => void
  onDropRejected: (files: File[]) => void
  onRemove: () => void
  isProcessing: boolean
  error?: string | null
}

const BannerUploadArea = ({
  fileInputRef,
  previewUrl,
  onFileInputChange,
  onFileSelect,
  onDropAccepted,
  onDropRejected,
  onRemove,
  isProcessing,
  error
}: BannerUploadAreaProps) => {
  const theme = useTheme()
  const [isDragActive, setIsDragActive] = useState(false)
  const hasBanner = Boolean(previewUrl)

  return (
    <Flex direction='column' gap='l'>
      <Flex alignItems='center' gap='s'>
        <Text variant='title' size='l'>
          {bannerMessages.title}
        </Text>
        <Text variant='body' size='m' color='subdued'>
          {coinDetailsMessages.editCoinDetails.optional}
        </Text>
      </Flex>
      <Text variant='body' size='m' color='subdued'>
        {bannerMessages.description}
      </Text>

      <input
        type='file'
        ref={fileInputRef}
        accept={ALLOWED_IMAGE_FILE_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={onFileInputChange}
      />

      <Flex
        as={ReactDropzone}
        // @ts-ignore
        multiple={false}
        accept={ALLOWED_IMAGE_FILE_TYPES.join(',')}
        onDropAccepted={(files: File[]) => {
          setIsDragActive(false)
          onDropAccepted(files)
        }}
        onDropRejected={(files: File[]) => {
          setIsDragActive(false)
          onDropRejected(files)
        }}
        onDragEnter={() => setIsDragActive(true)}
        onDragLeave={() => setIsDragActive(false)}
        disableClick
        disabled={isProcessing}
        direction='column'
        gap='l'
      >
        <Box
          w='100%'
          h={240}
          borderRadius='m'
          backgroundColor='white'
          css={{
            border: `1px dashed ${
              isDragActive
                ? theme.color.border.accent
                : theme.color.border.default
            }`,
            transition: `border-color ${theme.motion.hover}, background-color ${theme.motion.hover}`,
            cursor: isProcessing ? 'default' : 'pointer',
            backgroundImage: hasBanner
              ? `linear-gradient(0deg, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), url("${previewUrl}")`
              : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ':hover': {
              borderColor: isProcessing
                ? theme.color.border.default
                : theme.color.border.strong
            }
          }}
        >
          {isProcessing ? (
            <LoadingSpinner />
          ) : hasBanner ? null : (
            <Flex
              direction='column'
              alignItems='center'
              justifyContent='center'
              gap='s'
            >
              <IconCloudUpload color='default' />
              <Text variant='body' size='m' color='subdued' textAlign='center'>
                {bannerMessages.dragDrop}
              </Text>
              <Text variant='body' size='s' color='subdued' textAlign='center'>
                {bannerMessages.emptyState}
              </Text>
            </Flex>
          )}
        </Box>
        <Flex gap='s' alignItems='center'>
          <Button
            variant='secondary'
            size='small'
            type='button'
            disabled={isProcessing}
            onClick={(e) => {
              e.stopPropagation()
              onFileSelect()
            }}
          >
            {hasBanner ? bannerMessages.change : bannerMessages.upload}
          </Button>
          {hasBanner ? (
            <PlainButton
              type='button'
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
            >
              {bannerMessages.remove}
            </PlainButton>
          ) : null}
        </Flex>
      </Flex>
      {error ? (
        <Text color='danger' size='s' variant='body'>
          {error}
        </Text>
      ) : null}
    </Flex>
  )
}

type SetupPageProps = PhasePageProps

export const SetupPage = ({ onContinue, onBack }: SetupPageProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const { handleSubmit, setFieldValue, values, errors, touched } =
    useFormikContext<LaunchpadFormValues>()
  const { data: currentUser } = useCurrentAccountUser()

  const { trackFormInputChange } = useLaunchpadAnalytics()

  const imageUrl = useFormImageUrl(values.coinImage)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const [isProcessingBanner, setIsProcessingBanner] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)
  const bannerImageUrl = useFormImageUrl(values.bannerImage)
  const defaultBannerImageUrl = useMemo(
    () => getDefaultBannerImageUrl(currentUser),
    [currentUser]
  )
  const bannerPreviewUrl = bannerImageUrl ?? defaultBannerImageUrl ?? null

  const handleBack = () => {
    onBack?.()
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleContinue = () => {
    onContinue?.()
  }

  const handleFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
      trackFormInputChange('coinImage', file.name)
    }
  }

  const handleDropAccepted = async (files: File[]) => {
    const file = files[0]
    if (file) {
      await processFile(file)
      trackFormInputChange('coinImage', file.name)
    }
  }

  const handleDropRejected = (files: File[]) => {
    const file = files[0]
    if (file) {
      if (!ALLOWED_IMAGE_FILE_TYPES.includes(file.type)) {
        setImageError(messages.errors.invalidFileType)
      } else if (file.size > MAX_IMAGE_SIZE) {
        setImageError(messages.errors.fileTooLarge)
      } else {
        setImageError(messages.errors.processingError)
      }
    }
  }

  const handleBannerFileSelect = () => {
    bannerFileInputRef.current?.click()
  }

  const handleBannerFileInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      await processBannerFile(file)
      trackFormInputChange('bannerImage', file.name)
    }
    event.target.value = ''
  }

  const handleBannerDropAccepted = async (files: File[]) => {
    const file = files[0]
    if (file) {
      await processBannerFile(file)
      trackFormInputChange('bannerImage', file.name)
    }
  }

  const handleBannerDropRejected = (files: File[]) => {
    const file = files[0]
    if (file) {
      if (!ALLOWED_IMAGE_FILE_TYPES.includes(file.type)) {
        setBannerError(bannerMessages.errors.invalidFileType)
      } else if (file.size > MAX_IMAGE_SIZE) {
        setBannerError(bannerMessages.errors.fileTooLarge)
      } else {
        setBannerError(bannerMessages.errors.processingError)
      }
    }
  }

  const processBannerFile = async (file: File) => {
    setBannerError(null)

    if (!ALLOWED_IMAGE_FILE_TYPES.includes(file.type)) {
      setBannerError(bannerMessages.errors.invalidFileType)
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setBannerError(bannerMessages.errors.fileTooLarge)
      return
    }

    setIsProcessingBanner(true)
    try {
      const processedFile = await resizeImage(file, 2000, false)
      setFieldValue('bannerImage', processedFile)
    } catch (error) {
      reportToSentry({
        error: error instanceof Error ? error : new Error(error as string),
        name: 'Launchpad Banner Upload Processing Error',
        feature: Feature.ArtistCoins,
        level: ErrorLevel.Warning
      })
      setBannerError(bannerMessages.errors.processingError)
    } finally {
      setIsProcessingBanner(false)
    }
  }

  const handleBannerRemove = () => {
    setFieldValue('bannerImage', null)
    setBannerError(null)
  }

  const processFile = async (file: File) => {
    // Clear any previous errors
    setImageError(null)

    // Check file type
    if (!ALLOWED_IMAGE_FILE_TYPES.includes(file.type)) {
      setImageError(messages.errors.invalidFileType)
      return
    }

    // Check file size (15MB limit)
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError(messages.errors.fileTooLarge)
      return
    }

    setIsProcessingImage(true)
    try {
      // Process the image with resizeImage (converts to JPEG, resizes to 1000x1000)
      const processedFile = await resizeImage(file, 1000, true)
      setFieldValue('coinImage', processedFile)
      // Hook will automatically create blob URL from processed file
    } catch (error) {
      reportToSentry({
        error: error instanceof Error ? error : new Error(error as string),
        name: 'Launchpad Image Upload Processing Error',
        feature: Feature.ArtistCoins,
        level: ErrorLevel.Warning // not worth alerting on here
      })
      setImageError(messages.errors.processingError)
    } finally {
      setIsProcessingImage(false)
    }
  }

  return (
    <>
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='l'
        pb='unit20'
      >
        <Paper p='2xl' gap='2xl' direction='column' w='100%'>
          <Flex direction='column' gap='xs' alignItems='flex-start'>
            <Text variant='label' size='s' color='subdued'>
              {messages.stepInfo}
            </Text>
            <Text variant='heading' size='l' color='default'>
              {messages.title}
            </Text>
            <Text variant='body' size='l' color='subdued'>
              {messages.description}{' '}
              <ExternalTextLink
                to={route.ARTIST_COIN_TERMS}
                variant='visible'
                target='_blank'
                rel='noopener noreferrer'
              >
                {messages.rightsLinkText}
              </ExternalTextLink>
              .
            </Text>
          </Flex>

          <form onSubmit={handleSubmit}>
            <Flex direction='column' gap='xl'>
              <CoinFormFields />

              <ImageUploadArea
                fileInputRef={fileInputRef}
                coinImage={values.coinImage}
                imageUrl={imageUrl}
                onFileSelect={handleFileSelect}
                onFileInputChange={handleFileInputChange}
                onDropAccepted={handleDropAccepted}
                onDropRejected={handleDropRejected}
                error={
                  imageError ??
                  (touched.coinImage && errors.coinImage
                    ? errors.coinImage
                    : undefined)
                }
                isProcessing={isProcessingImage}
              />

              <BannerUploadArea
                fileInputRef={bannerFileInputRef}
                previewUrl={bannerPreviewUrl}
                onFileInputChange={handleBannerFileInputChange}
                onFileSelect={handleBannerFileSelect}
                onDropAccepted={handleBannerDropAccepted}
                onDropRejected={handleBannerDropRejected}
                onRemove={handleBannerRemove}
                isProcessing={isProcessingBanner}
                error={bannerError}
              />
            </Flex>
          </form>
        </Paper>
      </Flex>
      <ArtistCoinsSubmitRow
        onContinue={handleContinue}
        onBack={handleBack}
        isValid={
          !errors.coinName &&
          !errors.coinSymbol &&
          !errors.coinImage &&
          !isProcessingBanner &&
          !bannerError
        }
      />
    </>
  )
}
