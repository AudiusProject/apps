import {
  useArtistCoinByTicker,
  useUpdateArtistCoin,
  useCurrentUserId
} from '@audius/common/api'
import {
  MAX_COIN_DESCRIPTION_LENGTH,
  useEditCoinDetailsFormConfiguration,
  type EditCoinDetailsFormValues
} from '@audius/common/hooks'
import { coinDetailsMessages } from '@audius/common/messages'
import { removeNullable } from '@audius/common/utils'
import { useRoute, useNavigation } from '@react-navigation/native'
import { useFormikContext, Formik } from 'formik'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { reportToSentry } from 'store/errors/reportToSentry'

import {
  IconInstagram,
  IconLink,
  IconPlus,
  IconX,
  IconTikTok,
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

  const {
    data: coin,
    isPending,
    isSuccess,
    isError
  } = useArtistCoinByTicker({ ticker })

  const updateCoinMutation = useUpdateArtistCoin()

  const handleSubmit = async (values: EditCoinDetailsFormValues) => {
    if (!coin) return

    // Transform social links array for API - include empty strings to indicate deletion
    const transformedValues = {
      description: values.description,
      links: values.socialLinks.filter(
        (link: string) => link !== null && link !== undefined
      )
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
