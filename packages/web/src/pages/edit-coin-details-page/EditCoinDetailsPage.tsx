import {
  ChangeEvent,
  createContext,
  useCallback,
  useRef,
  useState
} from 'react'

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
import { route, removeNullable } from '@audius/common/utils'
import {
  Box,
  Divider,
  Flex,
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
import { reportToSentry } from 'store/errors/reportToSentry'

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

export const EditCoinDetailsPage = () => {
  const { ticker } = useParams<{ ticker: string }>()
  const { data: currentUserId } = useCurrentUserId()
  const navigate = useNavigate()

  const {
    data: coin,
    isPending,
    isSuccess,
    isError
  } = useArtistCoinByTicker({ ticker })

  const [submitError, setSubmitError] = useState<string | undefined>(undefined)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const updateCoinMutation = useUpdateArtistCoin()

  const handleSubmit = async (values: any) => {
    if (!coin) return
    // Clear any previous errors
    setSubmitError(undefined)

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
                <Box backgroundColor='white' borderRadius='m' border='default'>
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
                isSubmitting={isSubmitting}
              />
            </EditFormScrollContext.Provider>
          </Form>
        )}
      </Formik>
    </Page>
  )
}
