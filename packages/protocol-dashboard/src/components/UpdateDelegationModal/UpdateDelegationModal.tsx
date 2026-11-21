import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
  Box,
  Divider,
  Flex,
  HarmonyTheme,
  SegmentedControl,
  Text,
  TokenAmountInput,
  useTheme
} from '@audius/harmony'
import BN from 'bn.js'

import Button, { ButtonType } from 'components/Button'
import DisplayAudio from 'components/DisplayAudio'
import ErrorModal from 'components/ErrorModal'
import { InfoBox } from 'components/InfoBox/InfoBox'
import {
  DelegatedAudioInfoTooltip,
  NodeOperatorInfoTooltip,
  NodeServiceFeeInfoTooltip
} from 'components/InfoTooltip/InfoTooltips'
import Loading from 'components/Loading'
import { DelegateInfo } from 'components/ManageAccountCard/ManageAccountCard'
import Modal from 'components/Modal'
import { BasicTooltip, Position } from 'components/Tooltip/Tooltip'
import AudiusClient from 'services/Audius'
import {
  useAccountUser,
  useHasPendingDecreaseDelegationTx
} from 'store/account/hooks'
import useUpdateDelegation from 'store/actions/updateDelegation'
import { useUserDelegation } from 'store/actions/userDelegation'
import { usePendingClaim } from 'store/cache/claims/hooks'
import { useUser } from 'store/cache/user/hooks'
import { Address, Operator, Status } from 'types'
import { TICKER } from 'utils/consts'
import { formatWeiNumber } from 'utils/format'
import { useModalControls } from 'utils/hooks'
import { checkWeiNumber, parseWeiNumber } from 'utils/numeric'
import { COOLDOWN_PERIOD_DOCS_URL } from 'utils/routes'
import { sharedMessages } from 'utils/sharedMessages'

import styles from './UpdateDelegationModal.module.css'

const messages = {
  manageDelegation: 'Manage Delegation',
  increase: 'Increase by',
  decrease: 'Decrease by',
  manage: 'Manage',
  saveChanges: 'Save Changes',
  increaseTitle: 'Increase Delegation',
  increaseBtn: 'Increase Delegation',
  decreaseTitle: 'Decrease Delegation',
  decreaseBtn: 'Decrease Delegation',
  pendingDecreaseDisabled:
    'Not permitted while you still have a pending Decrease Delegation (Undelegate) transaction.',
  pendingClaimDisabled:
    'You cannot change your delegation amount while the operator has an unclaimed reward distribution.',
  currentDelegation: 'Current Delegation',
  change: 'Change',
  newStakingAmount: 'New Delegation Amount',
  nodeOperator: 'Node Operator',
  stakingLabel: TICKER,
  operatorFee: 'Operator Fee',
  enterAmount: 'Enter an amount',
  oldDelegation: `Old  Delegation ${TICKER}`,
  newDelegation: `New  Delegation ${TICKER}`,
  max: 'Max',
  noAudio: `You have no ${TICKER} available to delegate`,
  balanceExceeded: `Exceeds amount of ${TICKER} in wallet`,
  maxDelegationExceeded: "Exceeds this node's maximum delegation amount",
  minDelegationNotMet: "Will not meet this node's minimum delegation amount"
}

type OwnProps = {
  wallet: Address
  delegates: BN
  isOpen: boolean
  onClose: () => void
}

type UpdateDelegationModalProps = OwnProps

const UpdateDelegationModal: React.FC<UpdateDelegationModalProps> = ({
  delegates,
  isOpen,
  onClose,
  wallet
}: UpdateDelegationModalProps) => {
  const { user: serviceUser } = useUser({ wallet })
  const { user: accountUser } = useAccountUser()
  const { color } = useTheme() as HarmonyTheme
  const [inputValue, setInputValue] = useState('')
  const [inputNumberValue, setInputNumberValue] = useState(new BN(0))
  const { min: minDelegation, max: maxDelegation } = useUserDelegation(wallet)
  const [selectedOption, setSelectedOption] = useState<'increase' | 'decrease'>(
    'increase'
  )
  const isIncrease = selectedOption === 'increase'
  const reset = () => {
    setInputValue('')
    setInputNumberValue(new BN(0))
    setSelectedOption('increase')
  }
  const maxDecrease = delegates.sub(minDelegation)
  const maxIncrease = BN.min(
    maxDelegation.sub(delegates),
    accountUser?.audToken ?? maxDelegation.sub(delegates)
  )

  const deployerCut =
    (serviceUser as Operator)?.serviceProvider?.deployerCut ?? null

  const {
    isOpen: isErrorModalOpen,
    onClick: openErrorModal,
    onClose: onCloseErrorModal
  } = useModalControls()
  const { status, updateDelegation, error } = useUpdateDelegation(
    isIncrease,
    !isErrorModalOpen
  )

  useEffect(() => {
    if (error) {
      openErrorModal()
    }
  }, [error, openErrorModal])

  const newDelegationAmount = useMemo(() => {
    if (isIncrease) {
      return delegates.add(inputNumberValue)
    } else {
      return delegates.sub(inputNumberValue)
    }
  }, [delegates, isIncrease, inputNumberValue])

  const onConfirm = useCallback(() => {
    updateDelegation(wallet, inputNumberValue)
  }, [updateDelegation, wallet, inputNumberValue])

  useEffect(() => {
    if (status === Status.Success) {
      reset()
      onClose()
      onCloseErrorModal()
    }
  }, [status, onClose, onCloseErrorModal])

  const hasError =
    (isIncrease && inputNumberValue.gt(maxIncrease)) ||
    (!isIncrease && inputNumberValue.gt(maxDecrease))

  let helperText: string | undefined
  if (isIncrease) {
    if (accountUser?.audToken.isZero()) {
      helperText = messages.noAudio
    } else if (inputNumberValue.gt(accountUser?.audToken)) {
      helperText = messages.balanceExceeded
    } else if (inputNumberValue.gt(maxIncrease)) {
      helperText = messages.maxDelegationExceeded
    }
  } else {
    if (inputNumberValue.gt(maxDecrease)) {
      helperText = messages.minDelegationNotMet
    }
  }

  const handleSelectOption = useCallback((option: 'increase' | 'decrease') => {
    setSelectedOption(option)
  }, [])

  const options = [
    {
      key: 'increase',
      text: messages.increase
    },
    {
      key: 'decrease',
      text: messages.decrease
    }
  ]

  const { hasClaim, status: claimStatus } = usePendingClaim(wallet)
  const hasPendingDecreaseResult = useHasPendingDecreaseDelegationTx()
  const isDecreaseDelegationDisabled =
    hasPendingDecreaseResult.status !== Status.Success ||
    hasPendingDecreaseResult.hasPendingDecreaseTx ||
    claimStatus !== Status.Success ||
    hasClaim
  const isIncreaseDelegationDisabled =
    claimStatus !== Status.Success || hasClaim
  const isDisabled =
    (isIncrease && maxIncrease.isZero()) ||
    (!isIncrease && maxDecrease.isZero()) ||
    (isDecreaseDelegationDisabled && !isIncrease) ||
    (isIncreaseDelegationDisabled && isIncrease)

  let actionDisabledText = ''

  if (isIncrease && isIncreaseDelegationDisabled) {
    actionDisabledText = messages.pendingClaimDisabled
  } else if (!isIncrease && isDecreaseDelegationDisabled) {
    if (hasPendingDecreaseResult.hasPendingDecreaseTx) {
      actionDisabledText = messages.pendingDecreaseDisabled
    } else {
      actionDisabledText = messages.pendingClaimDisabled
    }
  }

  const isLoading =
    !serviceUser ||
    !accountUser ||
    claimStatus === Status.Loading ||
    hasPendingDecreaseResult.status === Status.Loading

  if (isLoading) {
    return (
      <Modal
        title={messages.manageDelegation}
        className={styles.container}
        wrapperClassName={styles.wrapperClassName}
        isOpen={isOpen}
        onClose={onClose}
        isCloseable={true}
      >
        <Box mt='xl'>
          <Loading />
        </Box>
      </Modal>
    )
  }

  return (
    <>
      <Modal
        title={messages.manageDelegation}
        className={styles.container}
        wrapperClassName={styles.wrapperClassName}
        isOpen={isOpen}
        onClose={onClose}
        isCloseable={status !== Status.Loading}
        dismissOnClickOutside={status !== Status.Loading}
      >
        <div className={styles.content}>
          <Flex direction='column' gap='l' w='100%'>
            <SegmentedControl
              options={options}
              selected={selectedOption}
              onSelectOption={handleSelectOption}
              fullWidth
              disabled={status === Status.Loading}
            />
            <Flex justifyContent='space-between' w='100%'>
              <Flex gap='s' direction='column'>
                <Flex inline gap='xs' alignItems='center'>
                  <Text
                    variant='body'
                    size='m'
                    strength='strong'
                    color='subdued'
                  >
                    {messages.nodeOperator}
                  </Text>
                  <NodeOperatorInfoTooltip color='subdued' />
                </Flex>
                <DelegateInfo clickable={false} wallet={wallet} />
              </Flex>
              <Flex gap='s' direction='column' alignItems='flex-end'>
                <Flex inline gap='xs' alignItems='center'>
                  <Text variant='body' size='m' strength='strong'>
                    {messages.operatorFee}
                  </Text>
                  <NodeServiceFeeInfoTooltip color='subdued' />
                </Flex>
                <Text variant='heading' size='s'>
                  {deployerCut}%
                </Text>
              </Flex>
            </Flex>
            <Divider css={{ borderColor: color.neutral.n100 }} />
            {actionDisabledText ? (
              <Flex justifyContent='center'>
                <Text
                  variant='body'
                  size='l'
                  strength='strong'
                  textAlign='center'
                >
                  {actionDisabledText}
                </Text>
              </Flex>
            ) : (
              <>
                <Flex gap='l' alignItems='center'>
                  <TokenAmountInput
                    label={
                      selectedOption === 'increase'
                        ? messages.increase
                        : messages.decrease
                    }
                    isWhole={false}
                    placeholder={messages.enterAmount}
                    tokenLabel={TICKER}
                    decimals={8}
                    value={inputValue}
                    error={hasError}
                    disabled={isDisabled || status === Status.Loading}
                    onChange={(stringValue) => {
                      if (checkWeiNumber(stringValue)) {
                        setInputNumberValue(parseWeiNumber(stringValue)!)
                      }
                      setInputValue(stringValue)
                    }}
                    helperText={helperText}
                    max={
                      isIncrease
                        ? AudiusClient.displayShortAud(maxIncrease)
                        : AudiusClient.displayShortAud(maxDecrease)
                    }
                  />
                  <Button
                    onClick={() => {
                      setInputNumberValue(
                        isIncrease ? maxIncrease : maxDecrease
                      )
                      setInputValue(
                        isIncrease
                          ? formatWeiNumber(maxIncrease)
                          : formatWeiNumber(maxDecrease)
                      )
                    }}
                    isDisabled={status === Status.Loading}
                    className={styles.maxButton}
                    text={messages.max.toUpperCase()}
                    type={ButtonType.PRIMARY_ALT}
                  />
                </Flex>
                <Flex direction='column' gap='xs' alignSelf='center' p='l'>
                  <Flex gap='s'>
                    <Text variant='heading' size='s'>
                      <DisplayAudio amount={newDelegationAmount} />
                    </Text>

                    <Text
                      variant='heading'
                      size='s'
                      color='subdued'
                      css={{ textDecoration: 'line-through' }}
                    >
                      <DisplayAudio amount={delegates} />
                    </Text>
                  </Flex>
                  <Box>
                    <Flex inline gap='xs' alignItems='center'>
                      <Text
                        variant='body'
                        size='m'
                        strength='strong'
                        color='subdued'
                      >
                        {messages.newStakingAmount}
                      </Text>
                      <DelegatedAudioInfoTooltip color='subdued' />
                    </Flex>
                  </Box>
                </Flex>
                <Flex direction='column' gap='l' alignItems='center'>
                  {status === Status.Loading && isIncrease ? (
                    <Text variant='heading' size='s' color='warning'>
                      {sharedMessages.twoPopupsWarning}
                    </Text>
                  ) : null}
                  {status === Status.Loading ? (
                    <Loading />
                  ) : (
                    <Button
                      isDisabled={
                        !inputNumberValue || inputNumberValue.isZero()
                      }
                      text={messages.saveChanges}
                      type={ButtonType.PRIMARY}
                      onClick={onConfirm}
                    />
                  )}
                  {isIncrease ? null : (
                    <InfoBox
                      description={sharedMessages.undelegateCooldown}
                      ctaHref={COOLDOWN_PERIOD_DOCS_URL}
                      ctaText={sharedMessages.unddelegateCooldownCta}
                    />
                  )}
                </Flex>
              </>
            )}
          </Flex>
        </div>
      </Modal>
      <ErrorModal
        isOpen={isErrorModalOpen}
        onClose={onCloseErrorModal}
        message={!!error && error.includes('\n') ? error.split('\n')[0] : error}
      />
    </>
  )
}

type ManageDelegationProps = {
  delegates: BN
  wallet: Address
  disabledReason?: string | null
}
export const ManageDelegation = ({
  delegates,
  wallet,
  disabledReason
}: ManageDelegationProps) => {
  const { isOpen, onClick, onClose } = useModalControls()
  return (
    <>
      <BasicTooltip
        position={Position.TOP}
        text={disabledReason}
        isDisabled={!disabledReason}
      >
        <Button
          type={ButtonType.PRIMARY}
          text={messages.manage}
          css={{ width: '100%' }}
          onClick={onClick}
          isDisabled={Boolean(disabledReason)}
        />
      </BasicTooltip>
      <UpdateDelegationModal
        wallet={wallet}
        delegates={delegates}
        isOpen={isOpen}
        onClose={onClose}
      />
    </>
  )
}

export default UpdateDelegationModal
