import { useCallback, useEffect, useState } from 'react'

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
import type { Image } from '@audius/common/store'
import { removeNullable } from '@audius/common/utils'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useFormikContext, Formik } from 'formik'
import { Image as RNImage, View, StyleSheet } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import LinearGradient from 'react-native-linear-gradient'
import { reportToSentry } from 'store/errors/reportToSentry'

import {
  IconInstagram,
  IconLink,
  IconPlus,
  IconX,
  IconTikTok,
  IconImage,
  Flex,
  Text,
  PlainButton,
  Paper,
  Divider,
  spacing,
  Button,
  LoadingSpinner
} from '@audius/harmony-native'
import {
  TokenIcon,
  Screen,
  ScreenContent,
  FixedFooter
} from 'app/components/core'
import { TextAreaField } from 'app/components/fields/TextAreaField'
import { TextField } from 'app/components/fields/TextField'
import { useCoverPhoto } from 'app/components/image/CoverPhoto'
import { launchSelectImageActionSheet } from 'app/utils/launchSelectImageActionSheet'

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

const BANNER_HEIGHT = 104

type BannerImageSectionProps = {
  bannerImageUrl: string | null
  defaultBannerImageUrl: string | null
  onFileSelect: () => void
  isProcessing: boolean
  error?: string | null
}

const BannerImageSection = ({
  bannerImageUrl,
  defaultBannerImageUrl,
  onFileSelect,
  isProcessing,
  error
}: BannerImageSectionProps) => {
  const displayBannerUrl = bannerImageUrl ?? defaultBannerImageUrl
  const hasBanner = Boolean(displayBannerUrl)

  return (
    <View
      style={{ position: 'relative', height: BANNER_HEIGHT, width: '100%' }}
    >
      {hasBanner && displayBannerUrl ? (
        <>
          <RNImage
            key={displayBannerUrl}
            source={{ uri: displayBannerUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode='cover'
          />
          {/* Gradient overlay matching coin details page - horizontal gradient from left to right */}
          <LinearGradient
            colors={[
              'rgba(0, 0, 0, 0.05)',
              'rgba(0, 0, 0, 0.05)',
              'rgba(0, 0, 0, 0.02)',
              'rgba(0, 0, 0, 0.01)',
              'rgba(0, 0, 0, 0)'
            ]}
            locations={[0, 0.1, 0.2, 0.3, 0.45]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </>
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'white', borderWidth: 1, borderColor: '#efeff1' }
          ]}
        />
      )}

      {isProcessing ? (
        <Flex
          style={StyleSheet.absoluteFill}
          justifyContent='center'
          alignItems='center'
        >
          <LoadingSpinner />
        </Flex>
      ) : (
        <Flex
          style={StyleSheet.absoluteFill}
          direction='row'
          alignItems='flex-start'
          justifyContent='flex-end'
          p='l'
        >
          <Button
            variant='tertiary'
            size='small'
            onPress={onFileSelect}
            iconLeft={IconImage}
          >
            {coinDetailsMessages.editCoinDetails.bannerChange}
          </Button>
        </Flex>
      )}

      {error ? (
        <Text
          variant='body'
          size='s'
          color='danger'
          style={{ margin: spacing.xl, marginTop: spacing.l }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const SocialLinksSection = () => {
  const { values, setFieldValue, errors, touched } =
    useFormikContext<EditCoinDetailsFormValues>()

  const handleAddSocialLink = () => {
    const newLinks = [...values.socialLinks, '']
    setFieldValue('socialLinks', newLinks)
  }

  const handleLinkChange = (index: number, value: string) => {
    const newLinks = [...values.socialLinks]
    newLinks[index] = value
    setFieldValue('socialLinks', newLinks)
  }

  return (
    <Flex gap='l' alignItems='flex-start'>
      <Flex row alignItems='center' gap='s'>
        <Text variant='title' size='m'>
          {coinDetailsMessages.editCoinDetails.socialLinks}
        </Text>
        <Text variant='body' color='subdued'>
          {coinDetailsMessages.editCoinDetails.optional}
        </Text>
      </Flex>

      <Flex w='100%'>
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
              key={index}
              name={`socialLinks.${index}`}
              label={`${coinDetailsMessages.editCoinDetails.socialLink} ${index + 1}`}
              placeholder={coinDetailsMessages.editCoinDetails.pasteLink}
              hideLabel
              value={link}
              onChangeText={(value) => handleLinkChange(index, value)}
              startIcon={PlatformIcon}
              error={hasError}
              required={false}
              style={{ paddingHorizontal: 0 }}
            />
          )
        })}
      </Flex>
      {values.socialLinks.length < 4 ? (
        <PlainButton onPress={handleAddSocialLink} iconLeft={IconPlus}>
          {coinDetailsMessages.editCoinDetails.addAnotherLink}
        </PlainButton>
      ) : null}
    </Flex>
  )
}

export const EditCoinDetailsScreen = () => {
  const { ticker } = useRoute().params as { ticker: string }
  const navigation = useNavigation()
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useCurrentAccountUser()

  const {
    data: coin,
    isPending,
    isSuccess,
    isError
  } = useArtistCoinByTicker({ ticker })

  const { source: defaultBannerImageSource } = useCoverPhoto({
    userId: currentUser?.user_id,
    size: WidthSizes.SIZE_2000
  })
  const defaultBannerImageUrl =
    defaultBannerImageSource &&
    typeof defaultBannerImageSource === 'object' &&
    'uri' in defaultBannerImageSource
      ? defaultBannerImageSource.uri
      : null

  const updateCoinMutation = useUpdateArtistCoin()

  const [bannerImageFile, setBannerImageFile] = useState<Image | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [isProcessingBanner, setIsProcessingBanner] = useState(false)
  const [bannerError, setBannerError] = useState<string | null>(null)

  useEffect(() => {
    if (coin && !bannerImageFile) {
      setBannerPreviewUrl(coin.bannerImageUrl ?? null)
    }
  }, [coin, bannerImageFile])

  const handleBannerFileSelect = useCallback(() => {
    const handleImageSelected = (image: Image) => {
      setBannerError(null)
      setIsProcessingBanner(true)
      setBannerImageFile(image)
      // Use the file URI for preview (React Native format)
      // image.file can be string | File | { uri, name, type } from launchSelectImageActionSheet
      let previewUri = image.url
      if (image.file) {
        if (typeof image.file === 'object' && 'uri' in image.file) {
          previewUri = image.file.uri
        } else if (typeof image.file === 'string') {
          previewUri = image.file
        }
      }
      setBannerPreviewUrl(previewUri)
      setIsProcessingBanner(false)
    }

    // Use same dimensions as cover photo: width 2000, height 1000 (aspect ratio 2:1)
    launchSelectImageActionSheet(handleImageSelected, {
      width: 2000,
      height: 1000
    })
  }, [])

  const handleSubmit = async (values: EditCoinDetailsFormValues) => {
    if (!coin) return

    // Transform social links array for API - include empty strings to indicate deletion
    const transformedValues = {
      description: values.description,
      links: values.socialLinks.filter(
        (link: string) => link !== null && link !== undefined
      ),
      // SDK uploadFile accepts both web File objects and React Native file objects with { uri, name, type }
      bannerImageFile:
        bannerImageFile?.file &&
        typeof bannerImageFile.file === 'object' &&
        'uri' in bannerImageFile.file
          ? (bannerImageFile.file as any) // SDK handles React Native file format at runtime
          : undefined
    }

    try {
      await updateCoinMutation.mutateAsync({
        mint: coin.mint,
        updateCoinRequest: transformedValues
      })
      navigation.goBack()
    } catch (e) {
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

  if (
    !ticker ||
    (coin && currentUserId !== coin.ownerId) ||
    isError ||
    (isSuccess && !coin)
  ) {
    navigation.goBack()
    return null
  }

  if (isPending) {
    return (
      <Screen>
        <Flex h='100%' w='100%' justifyContent='center' alignItems='center'>
          <LoadingSpinner />
        </Flex>
      </Screen>
    )
  }
  return (
    <Formik {...formConfiguration}>
      {({ handleSubmit: formikSubmit }) => (
        <Screen title={coin?.name ?? `$${coin?.ticker}`} topbarRight={null}>
          <ScreenContent>
            <KeyboardAwareScrollView keyboardShouldPersistTaps='handled'>
              <Paper
                borderRadius='l'
                shadow='far'
                border='default'
                mh='s'
                mt='2xl'
                mb='5xl'
              >
                {/* Banner Image Section */}
                <BannerImageSection
                  bannerImageUrl={bannerPreviewUrl}
                  defaultBannerImageUrl={defaultBannerImageUrl ?? null}
                  onFileSelect={handleBannerFileSelect}
                  isProcessing={isProcessingBanner}
                  error={bannerError}
                />

                <Divider />

                <Flex row alignItems='center' gap='l' ph='l' pv='xl'>
                  <TokenIcon logoURI={coin?.logoUri} size='4xl' />
                  <Flex>
                    <Text variant='heading' size='s'>
                      {coin?.name}
                    </Text>
                    <Text variant='title' size='l' color='subdued'>
                      {`$${coin?.ticker}`}
                    </Text>
                  </Flex>
                </Flex>

                <Divider />

                <Flex gap='s' p='xl'>
                  <Text variant='title' size='m'>
                    {coinDetailsMessages.editCoinDetails.description}
                  </Text>
                  <TextAreaField
                    name='description'
                    label={''}
                    placeholder={
                      coinDetailsMessages.editCoinDetails.descriptionPlaceholder
                    }
                    maxLength={MAX_COIN_DESCRIPTION_LENGTH}
                    style={{ paddingHorizontal: 0 }}
                  />
                </Flex>

                <Divider />

                <Flex p='xl'>
                  <SocialLinksSection />
                </Flex>
              </Paper>
            </KeyboardAwareScrollView>
            <FixedFooter keyboardShowingOffset={spacing.unit24} avoidKeyboard>
              <Button onPress={() => formikSubmit()} fullWidth>
                {coinDetailsMessages.editCoinDetails.saveChanges}
              </Button>
            </FixedFooter>
          </ScreenContent>
        </Screen>
      )}
    </Formik>
  )
}
