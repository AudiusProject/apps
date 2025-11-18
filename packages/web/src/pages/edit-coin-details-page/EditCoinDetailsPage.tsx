import {
  ChangeEvent,
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import {
  useArtistCoinByTicker,
  useUpdateArtistCoin,
  useCurrentUserId,
  useCurrentAccountUser
} from '@audius/common/api'
import {
  MAX_COIN_DESCRIPTION_LENGTH,
  useEditCoinDetailsFormConfiguration,
  type EditCoinDetailsFormValues
} from '@audius/common/hooks'
import { coinDetailsMessages } from '@audius/common/messages'
import { WidthSizes } from '@audius/common/models'
import { route, removeNullable } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconImage,
  IconInstagram,
  IconLink,
  IconPlus,
  IconTikTok,
  IconX,
  LoadingSpinner,
  PlainButton,
  spacing,
  Text
} from '@audius/harmony'
import { Form, Formik, useFormikContext } from 'formik'
import { Redirect, useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom-v5-compat'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { AnchoredSubmitRowEdit } from 'components/edit/AnchoredSubmitRowEdit'
import { TextAreaField, TextField } from 'components/form-fields'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { useCoverPhoto } from 'hooks/useCoverPhoto'
import { reportToSentry } from 'store/errors/reportToSentry'
import {
  ALLOWED_IMAGE_FILE_TYPES,
  resizeImage
} from 'utils/imageProcessingUtil'

import { MAX_IMAGE_SIZE } from '../artist-coins-launchpad-page/constants'

// Local scroll context for the coin details form
const EditFormScrollContext = createContext(() => {})

// Helper function to detect platform from URL
const detectPlatform = (
  url: string
): 'x' | 'instagram' | 'tiktok' | 'website' => {
  const cleanUrl = url.toLowerCase().trim()

  if (cleanUrl.includes('twitter.com') || cleanUrl.includes('x.com')) {
    return 'x'
  }
  if (cleanUrl.includes('instagram.com')) {
    return 'instagram'
  }
  if (cleanUrl.includes('tiktok.com')) {
    return 'tiktok'
  }

  return 'website'
}

// Get platform icon
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'x':
      return IconX
    case 'instagram':
      return IconInstagram
    case 'tiktok':
      return IconTikTok
    case 'website':
    default:
      return IconLink
  }
}

const SocialLinksSection = () => {
  const { values, setFieldValue, errors, touched } =
    useFormikContext<EditCoinDetailsFormValues>()

  const handleAddSocialLink = () => {
    const newLinks = [...values.socialLinks, '']
    setFieldValue('socialLinks', newLinks)
  }

  const handleLinkChange = (
    index: number,
    value: ChangeEvent<HTMLInputElement> | string
  ) => {
    const newValue = typeof value === 'string' ? value : value.target.value
    const newLinks = [...values.socialLinks]
    newLinks[index] = newValue
    setFieldValue('socialLinks', newLinks)
  }

  return (
    <Flex column gap='l' m='xl'>
      <Flex alignItems='center' gap='s'>
        <Text variant='title' size='l'>
          {coinDetailsMessages.editCoinDetails.socialLinks}
        </Text>
        <Text variant='body' size='m' color='subdued'>
          {coinDetailsMessages.editCoinDetails.optional}
        </Text>
      </Flex>

      <Flex column gap='l' alignItems='flex-start'>
        {values.socialLinks.map((link: string, index: number) => {
          const platform = detectPlatform(link)
          const PlatformIcon = getPlatformIcon(platform)
          const fieldError = Array.isArray(errors.socialLinks)
            ? errors.socialLinks[index]
            : undefined
          const fieldTouched = Array.isArray(touched.socialLinks)
            ? touched.socialLinks[index]
            : touched.socialLinks
          const hasError = Boolean(fieldTouched && fieldError)

          return (
            <TextField
              name={`socialLinks.${index}`}
              key={index}
              label={`${coinDetailsMessages.editCoinDetails.socialLink} ${index + 1}`}
              placeholder={coinDetailsMessages.editCoinDetails.pasteLink}
              hideLabel
              value={link}
              onChange={(value) => handleLinkChange(index, value)}
              startIcon={PlatformIcon}
              error={hasError}
              helperText={hasError ? fieldError : undefined}
              required={false}
            />
          )
        })}

        {/* Add new link button */}
        {values.socialLinks.length < 4 && (
          <PlainButton onClick={handleAddSocialLink} iconLeft={IconPlus}>
            {coinDetailsMessages.editCoinDetails.addAnotherLink}
          </PlainButton>
        )}
      </Flex>
    </Flex>
  )
}

const bannerMessages = {
  change: coinDetailsMessages.editCoinDetails.bannerChange,
  errors: coinDetailsMessages.editCoinDetails.bannerErrors
}

type BannerImageSectionProps = {
  bannerImageUrl: string | null
  defaultBannerImageUrl: string | null
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onFileSelect: () => void
  isProcessing: boolean
  error?: string | null
}

const BannerImageSection = ({
  bannerImageUrl,
  defaultBannerImageUrl,
  fileInputRef,
  onFileInputChange,
  onFileSelect,
  isProcessing,
  error
}: BannerImageSectionProps) => {
  const displayBannerUrl = bannerImageUrl ?? defaultBannerImageUrl
  const hasBanner = Boolean(displayBannerUrl)

  return (
    <>
      <input
        type='file'
        ref={fileInputRef}
        accept={ALLOWED_IMAGE_FILE_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={onFileInputChange}
      />

      <Box
        w='100%'
        h={140}
        css={{
          position: 'relative',
          background: hasBanner
            ? `linear-gradient(90deg, rgba(0, 0, 0, 0.05) 10%, rgba(0, 0, 0, 0.02) 20%, rgba(0, 0, 0, 0.01) 30%, rgba(0, 0, 0, 0) 45%), url("${displayBannerUrl}")`
            : undefined,
          backgroundSize: hasBanner ? 'auto, cover' : undefined,
          backgroundPosition: hasBanner ? '0% 0%, 50% 50%' : undefined,
          backgroundRepeat: hasBanner ? 'repeat, no-repeat' : undefined,
          overflow: 'hidden',
          backgroundColor: hasBanner ? undefined : 'white',
          border: hasBanner ? 'none' : '1px solid var(--border-default)'
        }}
      >
        {isProcessing ? (
          <Flex alignItems='center' justifyContent='center' h='100%' w='100%'>
            <LoadingSpinner />
          </Flex>
        ) : (
          <Flex
            alignItems='flex-start'
            justifyContent='flex-end'
            p='l'
            h='100%'
            w='100%'
            css={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          >
            <Button
              variant='tertiary'
              size='small'
              type='button'
              disabled={isProcessing}
              onClick={onFileSelect}
              iconLeft={IconImage}
            >
              {bannerMessages.change}
            </Button>
          </Flex>
        )}
      </Box>
      {error ? (
        <Text
          color='danger'
          size='s'
          variant='body'
          css={(theme) => ({
            margin: theme.spacing.xl,
            marginTop: theme.spacing.l
          })}
        >
          {error}
        </Text>
      ) : null}
    </>
  )
}

export const EditCoinDetailsPage = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useCurrentAccountUser()
  const navigate = useNavigate()

  const {
    data: coin,
    isPending,
    isSuccess,
    isError
  } = useArtistCoinByTicker({ ticker })

  const { image: defaultBannerImageUrl } = useCoverPhoto({
    userId: currentUser?.user_id,
    size: WidthSizes.SIZE_2000
  })

  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const updateCoinMutation = useUpdateArtistCoin()

  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [isProcessingBanner, setIsProcessingBanner] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  useEffect(() => {
    if (coin && !bannerImageFile) {
      setBannerPreviewUrl(coin.bannerImageUrl ?? null)
    }
  }, [coin, bannerImageFile])

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl && bannerPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(bannerPreviewUrl)
      }
    }
  }, [bannerPreviewUrl])

  const handleBannerFileSelect = () => {
    bannerFileInputRef.current?.click()
  }

  const handleBannerFileInputChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      await processBannerFile(file)
    }
    event.target.value = ''
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
      setBannerImageFile(processedFile)
      const previewUrl = URL.createObjectURL(processedFile)
      setBannerPreviewUrl(previewUrl)
    } catch (error) {
      reportToSentry({
        error: error instanceof Error ? error : new Error(error as string),
        name: 'Coin Banner Upload Processing Error'
      })
      setBannerError(bannerMessages.errors.processingError)
    } finally {
      setIsProcessingBanner(false)
    }
  }

  const handleSubmit = async (values: any) => {
    if (!coin) return
    // Clear any previous errors
    setSubmitError(undefined)

    // Transform social links array for API - include empty strings to indicate deletion
    const links = values.socialLinks.filter(
      (link: string) => link !== null && link !== undefined
    )

    const transformedValues = {
      description: values.description,
      links,
      bannerImageFile: bannerImageFile ?? undefined
    }

    try {
      const result = await updateCoinMutation.mutateAsync({
        mint: coin.mint,
        updateCoinRequest: transformedValues
      })
      if (result?.bannerImageUrl !== undefined) {
        setBannerPreviewUrl(result.bannerImageUrl || null)
      }
      setBannerImageFile(null)
      setBannerError(null)
      navigate(route.coinPage(coin?.ticker ?? ''))
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'Failed to update coin details. Please try again.'
      setSubmitError(errorMessage)
      await reportToSentry({
        name: 'EditCoinDetails',
        error:
          e instanceof Error
            ? e
            : new Error(
                e instanceof Object && 'message' in e
                  ? (e.message as string)
                  : 'Unknown Error'
              ),
        additionalInfo: {
          raw: e
        }
      })
      throw e // Re-throw to let Formik handle the error
    }
  }

  // Populate initial social links from existing coin data
  const initialSocialLinks = [
    coin?.link1,
    coin?.link2,
    coin?.link3,
    coin?.link4
  ].filter(removeNullable)
  if (initialSocialLinks.length === 0) {
    initialSocialLinks.push('')
  }

  const initialValues: EditCoinDetailsFormValues = {
    description: coin?.description ?? '',
    socialLinks: initialSocialLinks
  }

  const formConfiguration = useEditCoinDetailsFormConfiguration(
    handleSubmit,
    initialValues
  )

  const header = (
    <Header
      primary={coinDetailsMessages.editCoinDetails.pageTitle}
      showBackButton={true}
    />
  )

  if (
    !ticker ||
    (coin && currentUserId !== coin.ownerId) ||
    isError ||
    (isSuccess && !coin)
  ) {
    return <Redirect to='/coins' />
  }

  if (isPending) {
    return (
      <Flex justifyContent='center' alignItems='center' h='100%'>
        <LoadingSpinner />
      </Flex>
    )
  }

  return (
    <Page title={coinDetailsMessages.editCoinDetails.pageTitle} header={header}>
      <Formik {...formConfiguration}>
        {({ isSubmitting }) => (
          <Form>
            <EditFormScrollContext.Provider value={scrollToTop}>
              <Flex ref={scrollRef} column w='100%'>
                <Box
                  backgroundColor='white'
                  borderRadius='m'
                  border='default'
                  css={{ overflow: 'hidden' }}
                >
                  {/* Banner Image Section */}
                  <BannerImageSection
                    bannerImageUrl={bannerPreviewUrl}
                    defaultBannerImageUrl={defaultBannerImageUrl ?? null}
                    fileInputRef={bannerFileInputRef}
                    onFileInputChange={handleBannerFileInputChange}
                    onFileSelect={handleBannerFileSelect}
                    isProcessing={isProcessingBanner}
                    error={bannerError}
                  />

                  {/* Divider */}
                  <Divider />

                  {/* Token Details Section */}
                  <Flex gap='s' m='xl'>
                    <TokenIcon
                      logoURI={coin?.logoUri}
                      w={spacing['4xl']}
                      h={spacing['4xl']}
                      hex
                    />
                    <Flex column justifyContent='center'>
                      <Text variant='heading' size='s'>
                        {coin?.name}
                      </Text>
                      <Text variant='title' size='l' color='subdued'>
                        ${coin?.ticker}
                      </Text>
                    </Flex>
                  </Flex>

                  {/* Divider */}
                  <Divider />

                  {/* Description Section */}
                  <Flex column gap='l' m='xl'>
                    <Text variant='title' size='l'>
                      {coinDetailsMessages.editCoinDetails.description}
                    </Text>

                    <TextAreaField
                      name='description'
                      css={{ height: 200 }}
                      placeholder={
                        coinDetailsMessages.editCoinDetails
                          .descriptionPlaceholder
                      }
                      maxLength={MAX_COIN_DESCRIPTION_LENGTH}
                    />
                  </Flex>

                  {/* Divider */}
                  <Divider />

                  {/* Social Links Section */}
                  <SocialLinksSection />
                </Box>
              </Flex>
              <AnchoredSubmitRowEdit
                errorText={submitError}
                isSubmitting={isSubmitting || isProcessingBanner}
              />
            </EditFormScrollContext.Provider>
          </Form>
        )}
      </Formik>
    </Page>
  )
}
