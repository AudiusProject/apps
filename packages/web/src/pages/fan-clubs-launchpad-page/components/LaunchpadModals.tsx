import { useEffect, useState } from 'react'

import { launchpadMessages } from '@audius/common/messages'
import {
  LaunchpadFormValues,
  LaunchCoinErrorMetadata
} from '@audius/common/models'
import { AUDIUS_FAN_CLUB_HELP_LINK } from '@audius/common/src/utils/route'
import { useSendTokensModal } from '@audius/common/store'
import { wAUDIO } from '@audius/fixed-decimal'
import {
  Flex,
  Hint,
  IconInfo,
  LoadingSpinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  Text,
  TextLink
} from '@audius/harmony'
import { useFormikContext } from 'formik'

import { AddressTile } from 'components/address-tile'
import { ExternalTextLink } from 'components/link'
import { env } from 'services/env'

const messages = launchpadMessages.submitModal

const LoadingState = ({ numTxs }: { numTxs: number }) => (
  <ModalContent>
    <Flex
      column
      alignItems='center'
      justifyContent='center'
      gap='xl'
      css={{
        minHeight: 600,
        minWidth: 720
      }}
    >
      <LoadingSpinner size='3xl' />
      <Flex column gap='s' alignItems='center'>
        <Flex column gap='s' alignItems='center'>
          <Text variant='heading' size='l'>
            {messages.awaitingConfirmation}
          </Text>
          <Text variant='body' size='l'>
            {messages.launchingDescription(numTxs)}
          </Text>
        </Flex>
        <Text variant='body' size='l' color='subdued'>
          {messages.couldTakeAMoment}
        </Text>
      </Flex>
    </Flex>
  </ModalContent>
)

/**
 * Rare edge case modal where the SDK call to add the coin to Audius fails
 */
const CoinNotInAudiusState = ({ mintAddress }: { mintAddress: string }) => (
  <>
    <ModalHeader showDismissButton={false}>
      <ModalTitle title={messages.errors.yourFanClubIsLive} />
    </ModalHeader>
    <ModalContent>
      <Flex column gap='2xl'>
        <Text variant='body' size='l' color='default'>
          {messages.errors.notInAudiusBody}
        </Text>
        <Flex column gap='s'>
          <Text variant='label' size='l' color='subdued'>
            {messages.addressTitle}
          </Text>
          <AddressTile address={mintAddress} shorten />
        </Flex>
      </Flex>
    </ModalContent>
  </>
)

/**
 * Rare edge case modal where an uncaught error crashed the tan-query useLaunchCoin mutation
 */
const UnknownErrorState = ({
  errorMetadata,
  mintAddress,
  onClose
}: {
  errorMetadata?: LaunchCoinErrorMetadata
  mintAddress: string | undefined
  onClose: () => void
}) => {
  return (
    <>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={messages.errors.unknownErrorTitle} />
      </ModalHeader>
      <ModalContent>
        <Flex column gap='2xl'>
          <Text variant='body' size='l' color='default'>
            {messages.errors.unknownErrorDescription(
              errorMetadata?.poolCreateConfirmed ?? false
            )}
          </Text>
          {mintAddress ? (
            <Flex column gap='s'>
              <Text variant='label' size='l' color='subdued'>
                {messages.addressTitle}
              </Text>
              <AddressTile address={mintAddress} shorten />
            </Flex>
          ) : null}
        </Flex>
      </ModalContent>
    </>
  )
}

const ErrorState = ({
  errorMetadata,
  mintAddress,
  onClose
}: {
  errorMetadata?: LaunchCoinErrorMetadata
  mintAddress: string | undefined
  onClose: () => void
}) => {
  if (errorMetadata?.poolCreateConfirmed && mintAddress) {
    return <CoinNotInAudiusState mintAddress={mintAddress} />
  }
  return (
    <UnknownErrorState
      errorMetadata={errorMetadata}
      mintAddress={mintAddress}
      onClose={onClose}
    />
  )
}

export const LaunchpadSubmitModal = ({
  isPending,
  isError,
  isOpen,
  onClose,
  mintAddress,
  errorMetadata
}: {
  isPending: boolean
  isError: boolean
  isOpen: boolean
  onClose: () => void
  mintAddress: string | undefined
  errorMetadata?: LaunchCoinErrorMetadata
}) => {
  const { values } = useFormikContext<LaunchpadFormValues>()
  const { payAmount } = values
  const payAmountNumber = Number(wAUDIO(payAmount).value)

  // State to manage delayed error display
  const [showError, setShowError] = useState(false)

  // This is a workaround.
  // There's a few times where isError gets set to true but we're closing the modal at the same time
  // This state "flashes" while the modal closes since the modal has a transition animation
  // So to work around it, I added a small delay to show the error state
  useEffect(() => {
    if (isError && !isPending) {
      const timer = setTimeout(() => {
        setShowError(true)
      }, 300)
      return () => clearTimeout(timer)
    } else if (isPending || !isError) {
      setShowError(false)
    }
  }, [isError, isPending])

  const isFirstBuyRetry =
    errorMetadata?.requestedFirstBuy && errorMetadata?.poolCreateConfirmed
  const isSDKCoinError =
    isError &&
    errorMetadata?.poolCreateConfirmed &&
    !errorMetadata?.sdkCoinAdded
  const numTxs = payAmount && payAmountNumber > 0 && !isFirstBuyRetry ? 2 : 1

  // Keep track of current state in a string so we avoid overlapping states
  const currentState = isPending ? 'pending' : showError ? 'error' : 'pending'
  return (
    <Modal
      isOpen={isOpen}
      size={currentState === 'error' ? 'small' : undefined}
      onClose={() => {
        if (currentState === 'error' && !isSDKCoinError) {
          onClose()
        }
      }}
    >
      {currentState === 'pending' ? <LoadingState numTxs={numTxs} /> : null}
      {currentState === 'error' ? (
        <ErrorState
          errorMetadata={errorMetadata}
          mintAddress={mintAddress || errorMetadata?.coinMetadata?.mint}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  )
}

export const InsufficientBalanceModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { onOpen: openSendTokensModal } = useSendTokensModal()

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='small'>
      <ModalHeader showDismissButton>
        <Flex justifyContent='center'>
          <Text variant='label' size='xl' strength='strong'>
            {messages.insufficientBalanceTitle}
          </Text>
        </Flex>
      </ModalHeader>
      <ModalContent>
        <Flex column gap='xl'>
          <Text variant='body' size='l' color='default'>
            {messages.insufficientBalanceDescription}
          </Text>

          <Flex column gap='l'>
            <Flex column gap='s'>
              <Text variant='body' size='l'>
                {'• '}
                <Text variant='body' size='l' strength='strong'>
                  {messages.solAmount}
                </Text>
                {messages.solDescription}
              </Text>
              <Text variant='body' size='l'>
                {messages.audioDescription}
              </Text>
            </Flex>
          </Flex>

          <Hint icon={IconInfo}>
            <Flex gap='m' column>
              <Text>{messages.hintText}</Text>
              <Flex gap='m'>
                <ExternalTextLink showUnderline to={AUDIUS_FAN_CLUB_HELP_LINK}>
                  {messages.learnHowToFund}
                </ExternalTextLink>
                <TextLink
                  showUnderline
                  onClick={() => {
                    openSendTokensModal({
                      mint: env.WAUDIO_MINT_ADDRESS,
                      isOpen: true
                    })
                  }}
                  css={({ color }) => ({ color: color.icon.default })}
                >
                  {messages.sendAudio}
                </TextLink>
              </Flex>
            </Flex>
          </Hint>
        </Flex>
      </ModalContent>
    </Modal>
  )
}
