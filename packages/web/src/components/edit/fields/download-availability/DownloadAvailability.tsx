import { useCallback } from 'react'

import {
  AccessConditions,
  DownloadTrackAvailabilityType,
  isContentFollowGated,
  isContentTipGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Box,
  Flex,
  IconUserFollowing,
  IconVisibilityPublic,
  IconCart,
  Text,
  TextLink,
  IconError,
  SegmentedControl,
  Option,
  Hint
} from '@audius/harmony'
import { useFormikContext } from 'formik'

import { MenuFormCallbackStatus } from 'components/data-entry/ContextualMenu'
import { Divider } from 'components/divider'
import { useTrackField } from 'components/edit-track/hooks'

import { STREAM_CONDITIONS } from '../types'

import { DownloadPriceField } from './DownloadPriceField'

const getMessages = (props: DownloadAvailabilityProps) => ({
  downloadAvailability: 'Download Availability',
  customize: 'Decide who can download your files.',
  public: 'Public',
  followers: 'Followers',
  premium: 'Premium',
  callout: {
    premium: `You're ${
      props.isUpload ? 'uploading' : 'editing'
    } a Premium track. By default, purchasers will be able to download your available files. If you'd like to sell your files, set your track to Public or Hidden in the`,
    specialAccess: `You're ${
      props.isUpload ? 'uploading' : 'editing'
    } a Special Access track. By default, users who unlock your track will be able to download your available files. If you'd like to sell your files, set your track to Public or Hidden in the`,
    priceAndAudience: 'Price & Audience Settings'
  }
})

type DownloadAvailabilityProps = {
  isUpload: boolean
  value: DownloadTrackAvailabilityType
  setValue: (value: DownloadTrackAvailabilityType) => void
}

export const DownloadAvailability = (props: DownloadAvailabilityProps) => {
  const { value, setValue } = props
  const messages = getMessages(props)

  const { submitForm, setStatus } = useFormikContext()
  const [{ value: streamConditions }] =
    useTrackField<Nullable<AccessConditions>>(STREAM_CONDITIONS)
  const isUsdcGated = isContentUSDCPurchaseGated(streamConditions)
  const isSpecialAccess =
    isContentFollowGated(streamConditions) ||
    isContentTipGated(streamConditions)
  const shouldRenderCallout = isUsdcGated || isSpecialAccess

  const getCalloutMessage = useCallback(() => {
    if (isUsdcGated) {
      return messages.callout.premium
    }
    if (isSpecialAccess) {
      return messages.callout.specialAccess
    }
    return ''
  }, [
    isSpecialAccess,
    isUsdcGated,
    messages.callout.premium,
    messages.callout.specialAccess
  ])

  const handleCalloutClick = useCallback(() => {
    setStatus(MenuFormCallbackStatus.OPEN_ACCESS_AND_SALE)
    submitForm()
  }, [setStatus, submitForm])

  const options: Option<DownloadTrackAvailabilityType>[] = [
    {
      key: DownloadTrackAvailabilityType.PUBLIC,
      text: messages.public,
      icon: <IconVisibilityPublic size='s' color='default' />
    },
    {
      key: DownloadTrackAvailabilityType.FOLLOWERS,
      text: messages.followers,
      icon: <IconUserFollowing size='s' color='default' />
    },
    {
      key: DownloadTrackAvailabilityType.USDC_PURCHASE,
      text: messages.premium,
      icon: <IconCart size='s' color='default' />,
      variant: 'default'
    }
  ]

  const handleOptionSelect = useCallback(
    (option: DownloadTrackAvailabilityType) => {
      setValue(option)
    },
    [setValue]
  )

  const textCss = shouldRenderCallout
    ? {
        opacity: 0.5
      }
    : {}

  return (
    <>
      <Flex direction='column'>
        <Text variant='title' size='l' css={textCss}>
          {messages.downloadAvailability}
        </Text>
        <Box mt='s'>
          <Text variant='body' css={textCss}>
            {messages.customize}
          </Text>
        </Box>
      </Flex>
      {shouldRenderCallout ? (
        <Hint icon={IconError}>
          {getCalloutMessage()}{' '}
          <TextLink onClick={handleCalloutClick} variant='visible'>
            {messages.callout.priceAndAudience}
          </TextLink>
        </Hint>
      ) : (
        <>
          <SegmentedControl
            onSelectOption={handleOptionSelect}
            selected={value}
            options={options}
            // Matches 0.18s entry animation
            forceRefreshAfterMs={180}
          />
          {value === DownloadTrackAvailabilityType.USDC_PURCHASE ? (
            <DownloadPriceField disabled={false} />
          ) : null}
        </>
      )}
      <Divider />
    </>
  )
}
