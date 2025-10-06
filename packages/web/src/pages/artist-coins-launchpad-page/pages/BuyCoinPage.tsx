import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useConnectedWallets,
  useFirstBuyQuote,
  useWalletAudioBalance
} from '@audius/common/api'
import { useDebouncedCallback } from '@audius/common/hooks'
import { Chain, LaunchpadFormValues } from '@audius/common/models'
import { AUDIO } from '@audius/fixed-decimal'
import {
  Artwork,
  Button,
  Flex,
  Hint,
  IconWallet,
  LoadingSpinner,
  Paper,
  Pill,
  Radio,
  RadioGroup,
  Text,
  TextLink,
  TokenAmountInput
} from '@audius/harmony'
import { useFormikContext } from 'formik'
import { usePrevious } from 'react-use'

import { IconAUDIO } from 'components/buy-audio-modal/components/Icons'
import { useFormImageUrl } from 'hooks/useFormImageUrl'
import { useLaunchpadConfig } from 'hooks/useLaunchpadConfig'

import { ArtistCoinsSubmitRow } from '../components/ArtistCoinsSubmitRow'
import { LaunchpadBuyModal } from '../components/LaunchpadBuyModal'
import type { PhasePageProps } from '../components/types'
import { AMOUNT_OF_STEPS } from '../constants'
import { getLastConnectedSolWallet, useLaunchpadAnalytics } from '../utils'
import { FIELDS } from '../validation'

const messages = {
  stepInfo: `STEP 3 of ${AMOUNT_OF_STEPS}`,
  title: 'Claim Your Share First',
  optional: 'optional',
  description:
    'Before your Artist Coin goes live, do you want to buy some at the lowest price?',
  youPay: 'You Pay',
  youReceive: 'You Receive',
  valueInUSDC: 'Value',
  hintMessage:
    "Buying now makes sure you can get in at the lowest price before others beat you to it. You'll still received your unlocked Artist Coins over time after your Coin reaches its graduation market cap (1M $AUDIO).",
  back: 'Back',
  errors: {
    quoteError: 'Failed to get a quote. Please try again.',
    valueTooHigh: 'Value is too high. Please enter a lower value.',
    insufficientBalance: 'Insufficient $AUDIO balance.',
    transactionFailed: 'Transaction failed. Please try again.'
  },
  createCoin: 'Create Coin',
  max: 'MAX',
  audioBalance: (balance: string) => `${balance} $AUDIO`,
  buyAudio: 'Buy $AUDIO',
  audioInputLabel: 'AUDIO',
  radios: {
    no: 'No, thanks.',
    yes: 'Yes, I want to buy my Artist Coin.'
  }
}

// Not to be confused with AUDIO_DECIMALS - this is the amount of decimal places the input will alow you to enter
const FORM_INPUT_DECIMALS = 8

const INPUT_DEBOUNCE_TIME = 400

const AUDIO_BALANCE_POLL_INTERVAL = 3000

export const BuyCoinPage = ({
  onContinue,
  onBack,
  submitErrorText,
  submitButtonText
}: PhasePageProps & {
  submitErrorText?: string
  submitButtonText?: string
}) => {
  // Use Formik context to manage form state, including payAmount and receiveAmount
  const { values, setFieldValue, errors, touched, validateForm } =
    useFormikContext<LaunchpadFormValues>()
  const { data: launchpadConfig } = useLaunchpadConfig()
  const { maxTokenOutputAmount, maxAudioInputAmount } = launchpadConfig ?? {
    maxTokenOutputAmount: Infinity,
    maxAudioInputAmount: Infinity
  }
  const [isPayAmountChanging, setIsPayAmountChanging] = useState(false)
  const [isReceiveAmountChanging, setIsReceiveAmountChanging] = useState(false)
  const { data: connectedWallets } = useConnectedWallets()
  const connectedWallet = useMemo(
    () => getLastConnectedSolWallet(connectedWallets),
    [connectedWallets]
  )

  const {
    trackBuyModalOpen,
    trackBuyModalClose,
    trackFirstBuyQuoteReceived,
    trackFormInputChange,
    trackFirstBuyMaxButton
  } = useLaunchpadAnalytics({
    externalWalletAddress: connectedWallet?.address
  })
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false)
  const handleBuyModalOpen = () => {
    trackBuyModalOpen()
    setIsBuyModalOpen(true)
  }
  const handleBuyModalClose = () => {
    trackBuyModalClose()
    setIsBuyModalOpen(false)
  }
  const { data: audioBalance } = useWalletAudioBalance(
    {
      address: connectedWallet?.address ?? '',
      chain: connectedWallet?.chain ?? Chain.Sol
    },
    { refetchInterval: AUDIO_BALANCE_POLL_INTERVAL }
  )
  const { audioBalanceString } = useMemo(() => {
    if (!audioBalance) {
      return { audioBalanceString: '0.00', audioBalanceInt: 0 }
    }
    return {
      audioBalanceString: AUDIO(audioBalance).toLocaleString('en-US', {
        maximumFractionDigits: 2,
        roundingMode: 'trunc'
      }),
      audioBalanceInt: Number(AUDIO(audioBalance).toFixed(2))
    }
  }, [audioBalance])

  const imageUrl = useFormImageUrl(values.coinImage)

  // Get the first buy quote using the hook
  const {
    data: firstBuyQuoteData,
    mutate: getFirstBuyQuote,
    isPending: isFirstBuyQuotePending,
    error: firstBuyQuoteError
  } = useFirstBuyQuote()

  // Resets inputs from disabled when the api call is not pending
  useEffect(() => {
    if (!isFirstBuyQuotePending) {
      setIsPayAmountChanging(false)
      setIsReceiveAmountChanging(false)
    }
  }, [isFirstBuyQuotePending])

  const prevFirstBuyQuoteData = usePrevious(firstBuyQuoteData)
  // When quote comes back, update our inputs with the new values
  useEffect(() => {
    if (firstBuyQuoteData) {
      setFieldValue(
        FIELDS.usdcValue,
        firstBuyQuoteData.usdcAmountUiString ?? '0.00'
      )

      if (isReceiveAmountChanging) {
        setFieldValue(
          FIELDS.receiveAmount,
          firstBuyQuoteData.tokenAmountUiString
        )
        trackFirstBuyQuoteReceived({
          payAmount: firstBuyQuoteData.audioAmountUiString,
          receiveAmount: firstBuyQuoteData.tokenAmountUiString,
          usdcValue: firstBuyQuoteData.usdcAmountUiString ?? '0.00'
        })

        validateForm()
      }
      if (isPayAmountChanging) {
        setFieldValue(FIELDS.payAmount, firstBuyQuoteData.audioAmountUiString)
        trackFirstBuyQuoteReceived({
          payAmount: firstBuyQuoteData.audioAmountUiString,
          receiveAmount: firstBuyQuoteData.tokenAmountUiString,
          usdcValue: firstBuyQuoteData.usdcAmountUiString ?? '0.00'
        })
        validateForm()
      }
    }
  }, [
    firstBuyQuoteData,
    setFieldValue,
    isReceiveAmountChanging,
    isPayAmountChanging,
    prevFirstBuyQuoteData,
    validateForm,
    trackFormInputChange,
    trackFirstBuyQuoteReceived
  ])

  const handleBack = () => {
    onBack?.()
  }

  const handleContinue = () => {
    onContinue?.()
  }

  const handleRadioChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.value
    setFieldValue(FIELDS.wantsToBuy, newValue)
    trackFormInputChange('wantsToBuy', newValue)

    // If user selects "no", reset the first buy form fields and their errors
    if (newValue === 'no') {
      setFieldValue(FIELDS.payAmount, '')
      setFieldValue(FIELDS.receiveAmount, '')
      setFieldValue(FIELDS.usdcValue, '')
    }
    await validateForm()
  }

  const handleMaxClick = () => {
    trackFirstBuyMaxButton(audioBalanceString)
    setFieldValue(FIELDS.payAmount, audioBalanceString)
    debouncedPayAmountChange(audioBalanceString)
  }

  const debouncedPayAmountChange = useDebouncedCallback(
    async (payAmount: string) => {
      const payAmountNumber = parseFloat(payAmount)
      // NOTE: unfortunately with the way this form is set up its easier to manually validate max values here (not using formik errors field)
      if (
        payAmount &&
        payAmountNumber <= maxAudioInputAmount &&
        payAmountNumber > 0
      ) {
        setIsReceiveAmountChanging(true)
        getFirstBuyQuote({ audioUiInputAmount: payAmount })
      } else {
        setFieldValue(FIELDS.usdcValue, '')
        setFieldValue(FIELDS.receiveAmount, '')
      }
    },
    [getFirstBuyQuote, maxAudioInputAmount, setFieldValue],
    INPUT_DEBOUNCE_TIME
  )

  const debouncedReceiveAmountChange = useDebouncedCallback(
    async (receiveAmount: string) => {
      const receiveAmountNumber = parseFloat(receiveAmount)
      // NOTE: unfortunately with the way this form is set up its easier to manually validate max values here (not using formik errors field)
      if (
        receiveAmount &&
        receiveAmountNumber <= maxTokenOutputAmount &&
        receiveAmountNumber > 0
      ) {
        setIsPayAmountChanging(true)
        getFirstBuyQuote({ tokenUiOutputAmount: receiveAmount })
      } else {
        setFieldValue(FIELDS.payAmount, '')
        setFieldValue(FIELDS.usdcValue, '')
      }
    },
    [getFirstBuyQuote, maxTokenOutputAmount, setFieldValue],
    INPUT_DEBOUNCE_TIME
  )

  const handlePayAmountChange = useCallback(
    async (value: string, _valueBigInt: bigint) => {
      setFieldValue(FIELDS.payAmount, value)
      debouncedPayAmountChange(value)
    },
    [setFieldValue, debouncedPayAmountChange]
  )

  const handleReceiveAmountChange = useCallback(
    (value: string, _valueBigInt: bigint) => {
      setFieldValue(FIELDS.receiveAmount, value)
      debouncedReceiveAmountChange(value)
    },
    [setFieldValue, debouncedReceiveAmountChange]
  )

  const submitFooterErrorText =
    submitErrorText ||
    (firstBuyQuoteError ? messages.errors.quoteError : undefined)

  return (
    <>
      {isBuyModalOpen ? (
        <LaunchpadBuyModal
          isOpen={isBuyModalOpen}
          onClose={handleBuyModalClose}
        />
      ) : null}
      <Flex
        direction='column'
        alignItems='center'
        justifyContent='center'
        gap='l'
      >
        <Paper p='2xl' gap='2xl' direction='column' w='100%'>
          <Flex direction='column' gap='xs' alignItems='flex-start'>
            <Text variant='label' size='s' color='subdued'>
              {messages.stepInfo}
            </Text>
            <Flex alignItems='center' gap='s'>
              <Text variant='heading' size='l'>
                {messages.title}
              </Text>
              <Pill variant='primary'>{messages.optional}</Pill>
            </Flex>
            <Text variant='body' size='l' color='subdued'>
              {messages.description}
            </Text>
          </Flex>

          {/* Radio Buttons */}
          <RadioGroup
            name='wantsToBuy'
            value={values[FIELDS.wantsToBuy] ?? ''}
            onChange={handleRadioChange}
            gap='xl'
          >
            <Flex
              as='label'
              alignItems='center'
              gap='s'
              css={{ cursor: 'pointer' }}
            >
              <Radio
                value='no'
                error={
                  !!errors[FIELDS.wantsToBuy] && touched[FIELDS.wantsToBuy]
                }
              />
              <Text variant='title' size='l' strength='weak'>
                {messages.radios.no}
              </Text>
            </Flex>
            <Flex
              as='label'
              alignItems='center'
              gap='s'
              css={{ cursor: 'pointer' }}
            >
              <Radio
                value='yes'
                error={
                  !!errors[FIELDS.wantsToBuy] && touched[FIELDS.wantsToBuy]
                }
              />
              <Text variant='title' size='l' strength='weak'>
                {messages.radios.yes}
              </Text>
            </Flex>
          </RadioGroup>

          {values[FIELDS.wantsToBuy] === 'yes' ? (
            <>
              {/* You Pay Section */}
              <Flex direction='column' gap='s'>
                <Flex
                  alignItems='center'
                  justifyContent='space-between'
                  w='100%'
                >
                  <Text variant='heading' size='s' color='default'>
                    {messages.youPay}
                  </Text>
                  <Flex gap='s'>
                    <TextLink variant='visible' onClick={handleBuyModalOpen}>
                      {messages.buyAudio}
                    </TextLink>
                    <Flex gap='xs'>
                      <IconWallet color='subdued' />
                      <Text variant='body' size='m' color='subdued'>
                        {messages.audioBalance(audioBalanceString)}
                      </Text>
                    </Flex>
                  </Flex>
                </Flex>
                <Flex gap='s' w='100%'>
                  <TokenAmountInput
                    label={messages.youPay}
                    tokenLabel={messages.audioInputLabel}
                    decimals={FORM_INPUT_DECIMALS}
                    value={values[FIELDS.payAmount] ?? ''}
                    onChange={handlePayAmountChange}
                    placeholder='0.00'
                    hideLabel
                    disabled={isPayAmountChanging}
                    endIcon={<IconAUDIO />}
                    error={!!errors[FIELDS.payAmount]}
                    helperText={errors[FIELDS.payAmount]}
                  />
                  <Button
                    variant='secondary'
                    size='large'
                    onClick={handleMaxClick}
                  >
                    {messages.max}
                  </Button>
                </Flex>
              </Flex>

              {/* You Receive Section */}
              <Flex direction='column' gap='s'>
                <Text variant='heading' size='s' color='default'>
                  {messages.youReceive}
                </Text>
                <TokenAmountInput
                  label={messages.youReceive}
                  tokenLabel={`$${values[FIELDS.coinSymbol]}`}
                  decimals={6}
                  value={values[FIELDS.receiveAmount] ?? ''}
                  onChange={handleReceiveAmountChange}
                  placeholder='0'
                  hideLabel
                  disabled={isReceiveAmountChanging}
                  endIcon={
                    imageUrl ? (
                      <Artwork
                        src={imageUrl}
                        hex={true}
                        w='xl'
                        h='xl'
                        borderWidth={0}
                      />
                    ) : null
                  }
                  error={!!errors[FIELDS.receiveAmount]}
                  helperText={errors[FIELDS.receiveAmount]}
                />
              </Flex>

              {/* USDC Value */}
              <Flex w='100%' alignItems='center' gap='xs'>
                <Text variant='body' size='m' color='subdued'>
                  {messages.valueInUSDC}
                </Text>
                {isFirstBuyQuotePending ? (
                  <LoadingSpinner size='s' css={{ display: 'inline-block' }} />
                ) : (
                  <Text variant='body' size='m' color='default'>
                    ${values[FIELDS.usdcValue] || '0.00'}
                  </Text>
                )}
              </Flex>
              <Hint>{messages.hintMessage}</Hint>
            </>
          ) : null}
        </Paper>
      </Flex>
      <ArtistCoinsSubmitRow
        cancelText={messages.back}
        backIcon
        onContinue={handleContinue}
        onBack={handleBack}
        submit
        continueText={submitButtonText ?? messages.createCoin}
        errorText={submitFooterErrorText}
      />
    </>
  )
}
