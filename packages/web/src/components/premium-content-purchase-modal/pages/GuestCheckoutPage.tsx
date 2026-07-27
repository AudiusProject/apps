import { usePurchaseableStemCount } from '@audius/common/hooks'
import { PurchaseableContentMetadata } from '@audius/common/src/hooks/purchaseContent/types'
import { isPurchaseableAlbum } from '@audius/common/src/hooks/purchaseContent/utils'
import { SIGN_IN_PAGE } from '@audius/common/src/utils/route'
import { USDC } from '@audius/fixed-decimal'
import { Button, Flex, Text } from '@audius/harmony'

import { TextLink } from 'components/link'
import { PurchaseSummaryTable } from 'components/premium-content-purchase-modal/components/PurchaseSummaryTable'
import { usePurchaseContentFormState } from 'components/premium-content-purchase-modal/hooks/usePurchaseContentFormState'
import { LockedContentDetailsTile } from 'components/track/LockedContentDetailsTile'
import { useIsMobile } from 'hooks/useIsMobile'
import { NewEmailField } from 'pages/sign-up-page/components/NewEmailField'
const messages = {
  continueAsGuest: 'Continue as Guest',
  signIn: 'Sign in.',
  alreadyHaveAnAccount: 'Already have an account?',
  orContinueGuest: 'Or, continue as a guest.'
}

const AUDIO_MATCHING_REWARDS_MULTIPLIER = 5

type GuestCheckoutProps = {
  metadata: PurchaseableContentMetadata
  price: number
  onClickSignIn: () => void
}

export const GuestCheckoutPage = (props: GuestCheckoutProps) => {
  const { metadata, price, onClickSignIn } = props

  const { purchaseSummaryValues } = usePurchaseContentFormState({
    price
  })
  const isMobile = useIsMobile()
  const isAlbumPurchase = isPurchaseableAlbum(metadata)
  const stemsPurchaseCount = usePurchaseableStemCount(metadata)
  const downloadPurchaseCount =
    'is_download_gated' in metadata &&
    metadata.is_download_gated &&
    metadata.is_downloadable
      ? 1
      : 0
  const streamPurchaseCount = metadata.is_stream_gated ? 1 : 0

  return (
    <Flex
      p={isMobile ? 'l' : 'xl'}
      direction='column'
      pb='m'
      justifyContent='space-between'
    >
      <Flex direction='column' gap='xl' w='100%'>
        <LockedContentDetailsTile
          showLabel={false}
          metadata={metadata}
          owner={metadata.user}
          earnAmount={USDC((price * AUDIO_MATCHING_REWARDS_MULTIPLIER) / 100)
            .round()
            .toShorthand()}
        />
        <PurchaseSummaryTable
          {...purchaseSummaryValues}
          stemsPurchaseCount={stemsPurchaseCount}
          downloadPurchaseCount={downloadPurchaseCount}
          streamPurchaseCount={streamPurchaseCount}
          totalPriceInCents={price}
          isAlbumPurchase={isAlbumPurchase}
        />
        <Flex
          direction='column'
          border='default'
          borderRadius='s'
          p='l'
          gap='l'
        >
          <Text variant='body' strength='strong'>
            {messages.alreadyHaveAnAccount}{' '}
            <TextLink
              to={SIGN_IN_PAGE}
              variant='visible'
              onClick={onClickSignIn}
            >
              {messages.signIn}
            </TextLink>{' '}
            {messages.orContinueGuest}
          </Text>

          <NewEmailField isGuestCheckout={true} />
        </Flex>
      </Flex>
    </Flex>
  )
}

export const GuestCheckoutFooter = () => {
  return (
    <Button fullWidth type='submit'>
      {messages.continueAsGuest}
    </Button>
  )
}
