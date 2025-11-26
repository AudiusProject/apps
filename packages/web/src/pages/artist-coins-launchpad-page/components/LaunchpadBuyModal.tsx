import { useContext, useEffect, useMemo, useState } from 'react'

import { useWalletAudioBalance } from '@audius/common/api'
import { buySellMessages } from '@audius/common/messages'
import { Chain, Name } from '@audius/common/models'
import {
  TOKEN_LISTING_MAP,
  useCoinSwapForm,
  CoinInfo,
  useCoinAmountFormatting
} from '@audius/common/store'
import {
  Button,
  Flex,
  IconInfo,
  IconJupiterLogo,
  IconQuestionCircle,
  LoadingSpinner,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  PlainButton,
  Text,
  TokenAmountInput
} from '@audius/harmony'
import { useAppKitAccount as useExternalWalletAccount } from '@reown/appkit/react'
import { FormikProvider, useFormikContext } from 'formik'
import { usePrevious } from 'react-use'

import { WALLET_GUIDE_URL } from 'components/buy-sell-modal'
import { SwapBalanceSection } from 'components/buy-sell-modal/SwapBalanceSection'
import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { TransactionSuccessScreen } from 'components/buy-sell-modal/TransactionSuccessScreen'
import { TokenDropdown } from 'components/buy-sell-modal/components/TokenDropdown'
import { IconAUDIO } from 'components/shared-icons/Icons'
import { ToastContext } from 'components/toast/ToastContext'
import { Tooltip } from 'components/tooltip'
import { useExternalWalletSwap } from 'hooks/useExternalWalletSwap'
import { make, track } from 'services/analytics'
import zIndex from 'utils/zIndex'

const INPUT_TOKEN_MAP: Record<
  string,
  CoinInfo & { minSwapAmount?: number; requiredRemainingBalance?: number }
> = {
  USDC: {
    ...TOKEN_LISTING_MAP.USDC,
    balance: null,
    isStablecoin: true,
    minSwapAmount: 0.01
  },
  SOL: {
    ...TOKEN_LISTING_MAP.SOL,
    balance: null,
    isStablecoin: false,
    minSwapAmount: 0.000001,
    requiredRemainingBalance: 0.03
  }
}

const INPUT_TOKEN_LIST = Object.values(INPUT_TOKEN_MAP)

const DEFAULT_INPUT_TOKEN = INPUT_TOKEN_MAP.SOL

const OUTPUT_TOKEN: CoinInfo = {
  ...TOKEN_LISTING_MAP.AUDIO,
  balance: null,
  isStablecoin: false
}

const FORM_INPUT_DECIMALS = 8 // This is the number of decimals that are allowed to be entered in the text input

type FormikValues = {
  inputAmount: string
  outputAmount: string
  selectedInputToken: CoinInfo
  selectedOutputToken: CoinInfo
}

const FormInputStep = ({
  onClose,
  onContinue,
  availableBalance,
  isBalanceLoading,
  isExchangeRateLoading,
  handleMaxClick: onMaxClick,
  onInputTokenChange,
  onInputAmountChange,
  onOutputAmountChange
}: {
  onClose: () => void
  onContinue: () => void
  availableBalance: number
  isBalanceLoading: boolean
  isExchangeRateLoading: boolean
  handleMaxClick: () => void
  onInputTokenChange: (token: CoinInfo) => void
  onInputAmountChange: (value: string) => void
  onOutputAmountChange: (value: string) => void
}) => {
  const { values, errors, setFieldValue } = useFormikContext<FormikValues>()

  const handleInputTokenChange = (token: CoinInfo) => {
    onInputTokenChange(token)
    track(
      make({
        eventName: Name.LAUNCHPAD_BUY_MODAL_CHANGE_CURRENCY,
        newCurrencySymbol: token.symbol
      })
    )
    setFieldValue('selectedInputToken', token)
  }

  const handleInputAmountBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    track(
      make({
        eventName: Name.LAUNCHPAD_BUY_MODAL_FORM_CHANGE,
        inputChanged: 'inputAmount',
        newValue: event.target.value
      })
    )
  }
  const handleOutputAmountBlur = (
    event: React.FocusEvent<HTMLInputElement>
  ) => {
    track(
      make({
        eventName: Name.LAUNCHPAD_BUY_MODAL_FORM_CHANGE,
        inputChanged: 'outputAmount',
        newValue: event.target.value
      })
    )
  }
  const handleMaxClick = () => {
    track(make({ eventName: Name.LAUNCHPAD_BUY_MODAL_MAX_BUTTON }))
    onMaxClick()
  }

  return (
    <>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={buySellMessages.buyAudioTitle} />
        <PlainButton
          size='default'
          iconLeft={IconQuestionCircle}
          onClick={() => {
            window.open(WALLET_GUIDE_URL, '_blank')
          }}
          css={(theme) => ({
            position: 'absolute',
            top: theme.spacing.xl,
            right: theme.spacing.xl,
            zIndex: zIndex.BUY_SELL_MODAL + 1
          })}
        >
          {buySellMessages.help}
        </PlainButton>
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='xl'>
          <Flex column gap='s'>
            {/* Balance text  */}
            <Flex justifyContent='space-between' alignItems='center'>
              <Text variant='title' size='l' color='default'>
                {buySellMessages.youPay}
              </Text>

              {!isBalanceLoading && availableBalance !== undefined ? (
                <Flex alignItems='center' gap='xs'>
                  <TokenIcon
                    logoURI={values.selectedInputToken.logoURI}
                    icon={values.selectedInputToken.icon}
                    size='s'
                    hex
                  />
                  <Text variant='body' size='m' strength='strong'>
                    {buySellMessages.formattedAvailableBalance(
                      availableBalance.toLocaleString('en-US', {
                        maximumFractionDigits: 4
                      }),
                      values.selectedInputToken.symbol,
                      !!values.selectedInputToken.isStablecoin,
                      buySellMessages.available
                    )}
                  </Text>
                  <Tooltip
                    text={buySellMessages.availableBalanceTooltip}
                    mount='body'
                  >
                    <IconInfo color='subdued' size='s' />
                  </Tooltip>
                </Flex>
              ) : null}
            </Flex>
            {/* Pay input */}
            <Flex gap='s' flex={1}>
              <Flex flex={1}>
                <TokenAmountInput
                  hideLabel
                  label={buySellMessages.youPay}
                  placeholder='0.00'
                  decimals={FORM_INPUT_DECIMALS}
                  tokenLabel={values.selectedInputToken.symbol}
                  value={values.inputAmount}
                  onChange={onInputAmountChange}
                  onBlur={handleInputAmountBlur}
                  error={!!errors.inputAmount}
                  helperText={errors.inputAmount}
                />
              </Flex>
              <Button variant='secondary' size='large' onClick={handleMaxClick}>
                {buySellMessages.max}
              </Button>
              <Flex css={(theme) => ({ minWidth: theme.spacing.unit15 })}>
                <TokenDropdown
                  selectedToken={values.selectedInputToken}
                  availableTokens={INPUT_TOKEN_LIST}
                  onTokenChange={handleInputTokenChange}
                />
              </Flex>
            </Flex>
          </Flex>
          {/* Receive input */}
          <Flex column gap='s'>
            <Text variant='title' size='l' color='default'>
              {buySellMessages.youReceive}
            </Text>
            <TokenAmountInput
              hideLabel
              placeholder='0.00'
              label={buySellMessages.youReceive}
              tokenLabel={OUTPUT_TOKEN.symbol}
              endIcon={<IconAUDIO />}
              value={values.outputAmount}
              onChange={onOutputAmountChange}
              onBlur={handleOutputAmountBlur}
            />
          </Flex>
          {/* Button */}
          <Button
            variant='primary'
            onClick={onContinue}
            disabled={isExchangeRateLoading}
            isLoading={isExchangeRateLoading}
          >
            {buySellMessages.continue}
          </Button>
        </Flex>
      </ModalContent>
      <ModalFooter gap='s' borderTop='strong' backgroundColor='surface1' pv='m'>
        <Text variant='label' size='xs' color='subdued'>
          {buySellMessages.poweredBy}
        </Text>
        <IconJupiterLogo />
      </ModalFooter>
    </>
  )
}

const ConfirmationStep = ({
  onClose,
  onBack,
  onConfirm,
  isConfirming
}: {
  onClose: () => void
  onBack: () => void
  onConfirm: () => void
  isConfirming: boolean
}) => {
  const { values } = useFormikContext<FormikValues>()
  const { formattedAmount: formattedPayAmount } = useCoinAmountFormatting({
    amount: values.inputAmount,
    isStablecoin: !!values.selectedInputToken.isStablecoin,
    decimals: values.selectedInputToken.decimals
  })

  const { formattedAmount: formattedReceiveAmount } = useCoinAmountFormatting({
    amount: values.outputAmount,
    isStablecoin: !!values.selectedOutputToken.isStablecoin,
    decimals: values.selectedOutputToken.decimals
  })
  return (
    <>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={buySellMessages.buyAudioTitle} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='l'>
          <Text variant='body' size='m' textAlign='center'>
            {buySellMessages.confirmReview}
          </Text>
          <Flex direction='column' gap='xl'>
            <SwapBalanceSection
              title={buySellMessages.youPay}
              tokenInfo={values.selectedInputToken}
              amount={formattedPayAmount ?? ''}
              hideUSDCTooltip
            />
            <SwapBalanceSection
              title={buySellMessages.youReceive}
              tokenInfo={values.selectedOutputToken}
              amount={formattedReceiveAmount ?? ''}
              hideUSDCTooltip
            />
          </Flex>

          <Flex gap='s' mt='xl'>
            <Button variant='secondary' fullWidth onClick={onBack}>
              {buySellMessages.back}
            </Button>
            <Button
              variant='primary'
              fullWidth
              onClick={onConfirm}
              isLoading={isConfirming}
            >
              {buySellMessages.confirm}
            </Button>
          </Flex>
        </Flex>
      </ModalContent>
    </>
  )
}

const SuccessStep = ({ onClose }: { onClose: () => void }) => {
  const { values } = useFormikContext<FormikValues>()

  return (
    <>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={buySellMessages.modalSuccessTitle} />
      </ModalHeader>
      <ModalContent css={{ padding: 0 }}>
        <TransactionSuccessScreen
          payTokenInfo={values.selectedInputToken}
          receiveTokenInfo={OUTPUT_TOKEN}
          baseTokenSymbol={values.selectedInputToken.symbol}
          payAmount={Number(values.inputAmount)}
          receiveAmount={Number(values.outputAmount)}
          exchangeRate={null}
          hideUSDCTooltip
          onDone={onClose}
        />
      </ModalContent>
    </>
  )
}

const LoadingStep = () => {
  return (
    <ModalContent>
      <Flex
        alignItems='center'
        justifyContent='center'
        flex={1}
        css={{ minHeight: 400, minWidth: 400 }}
      >
        <LoadingSpinner size='3xl' />
      </Flex>
    </ModalContent>
  )
}

enum BuyModalStep {
  Form = 'form',
  Confirmation = 'confirmation',
  Success = 'success',
  Loading = 'loading'
}

const AUDIO_BALANCE_POLL_INTERVAL = 1000 // short 1s poll interval to check for balance changes

export const LaunchpadBuyModal = ({
  isOpen,
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) => {
  const { toast } = useContext(ToastContext)
  const [selectedInputToken, setSelectedInputToken] =
    useState(DEFAULT_INPUT_TOKEN)

  const {
    mutate: swapTokens,
    isPending: swapPending,
    isSuccess: swapSuccess,
    isError: swapError,
    data: swapData
  } = useExternalWalletSwap()

  const onInputTokenChange = (token: CoinInfo) => {
    setSelectedInputToken(token)
  }
  const externalWalletAccount = useExternalWalletAccount()
  const externalWalletAddress = externalWalletAccount?.address
  const { data: audioBalance } = useWalletAudioBalance(
    {
      address: externalWalletAddress!,
      chain: Chain.Sol
    },
    { refetchInterval: AUDIO_BALANCE_POLL_INTERVAL }
  )
  const prevAudioBalance = usePrevious(audioBalance)

  // Due to RPC drift, we have to wait for the audio balance hook to show our changes
  // This is because the audio balance hook is polling, so an optimistic change here is not sufficient
  const hasAudioBalanceChanged = useMemo(() => {
    return (
      prevAudioBalance !== undefined &&
      audioBalance?.toString() !== prevAudioBalance?.toString()
    )
  }, [audioBalance, prevAudioBalance])

  useEffect(() => {
    if (swapSuccess && hasAudioBalanceChanged) {
      track(make({ eventName: Name.LAUNCHPAD_BUY_MODAL_SUCCESS }))
      setCurrentStep(BuyModalStep.Success)
    }
    if (swapPending) {
      setCurrentStep(BuyModalStep.Loading)
    }
    if (swapError || swapData?.error) {
      track(
        make({ eventName: Name.LAUNCHPAD_BUY_MODAL_FAILURE, error: swapError })
      )
      console.error(swapError)
      const toastMessage = swapData?.error?.userCancelled
        ? buySellMessages.transactionCancelled
        : buySellMessages.transactionFailed
      toast(toastMessage, 5000)
      setCurrentStep(BuyModalStep.Form)
    }
  }, [
    swapSuccess,
    swapPending,
    swapError,
    toast,
    swapData,
    hasAudioBalanceChanged
  ])
  const {
    availableBalance,
    isBalanceLoading,
    isExchangeRateLoading,
    formik: buyModalForm,
    handleInputAmountChange,
    handleMaxClick,
    handleOutputAmountChange
  } = useCoinSwapForm({
    inputCoin: selectedInputToken,
    outputCoin: OUTPUT_TOKEN,
    externalWalletAddress,
    min: selectedInputToken.minSwapAmount,
    requiredRemainingBalance: selectedInputToken.requiredRemainingBalance
  })

  const [currentStep, setCurrentStep] = useState<BuyModalStep>(
    BuyModalStep.Form
  )

  const handleContinue = () => {
    track(make({ eventName: Name.LAUNCHPAD_BUY_MODAL_CONTINUE }))
    if (currentStep === BuyModalStep.Form && !isExchangeRateLoading) {
      setCurrentStep(BuyModalStep.Confirmation)
    } else if (currentStep === BuyModalStep.Confirmation) {
      track(
        make({
          eventName: Name.LAUNCHPAD_BUY_MODAL_SUBMIT,
          inputAmount: buyModalForm.values.inputAmount,
          outputAmount: buyModalForm.values.outputAmount,
          inputTokenSymbol: selectedInputToken.symbol,
          outputTokenSymbol: OUTPUT_TOKEN.symbol,
          walletAddress: externalWalletAddress!
        })
      )
      swapTokens({
        amountUi: Number(buyModalForm.values.inputAmount),
        inputMint: selectedInputToken.address,
        outputMint: OUTPUT_TOKEN.address,
        walletAddress: externalWalletAddress!,
        inputDecimals: selectedInputToken.decimals,
        outputDecimals: OUTPUT_TOKEN.decimals
      })
    }
  }

  const handleBack = () => {
    track(make({ eventName: Name.LAUNCHPAD_BUY_MODAL_BACK }))
    if (currentStep === BuyModalStep.Confirmation) {
      setCurrentStep(BuyModalStep.Form)
    }
  }

  const renderCurrentStep = () => {
    if (currentStep === BuyModalStep.Loading) {
      return <LoadingStep />
    }
    if (currentStep === BuyModalStep.Success) {
      return <SuccessStep onClose={onClose} />
    }
    if (currentStep === BuyModalStep.Confirmation) {
      return (
        <ConfirmationStep
          onClose={onClose}
          onBack={handleBack}
          onConfirm={handleContinue}
          isConfirming={false}
        />
      )
    }
    // Default to the form input step
    return (
      <FormInputStep
        onClose={onClose}
        onContinue={handleContinue}
        availableBalance={availableBalance}
        isBalanceLoading={isBalanceLoading}
        isExchangeRateLoading={isExchangeRateLoading}
        handleMaxClick={handleMaxClick}
        onInputTokenChange={onInputTokenChange}
        onInputAmountChange={handleInputAmountChange}
        onOutputAmountChange={handleOutputAmountChange}
      />
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='medium'>
      <FormikProvider value={buyModalForm}>
        {renderCurrentStep()}
      </FormikProvider>
    </Modal>
  )
}
