import React, { useCallback, useEffect, useState } from 'react'

import { Flex, Text, TokenAmountInput } from '@audius/harmony'
import { ButtonType } from '@audius/stems'
import BN from 'bn.js'

import Button from 'components/Button'
import ConfirmTransactionModal, {
  Delegating,
  ToOperator
} from 'components/ConfirmTransactionModal'
import { InfoBox } from 'components/InfoBox/InfoBox'
import {
  NodeOperatorInfoTooltip,
  NodeServiceFeeInfoTooltip
} from 'components/InfoTooltip/InfoTooltips'
import { DelegateInfo } from 'components/ManageAccountCard/ManageAccountCard'
import Modal from 'components/Modal'
import AudiusClient from 'services/Audius'
import { useAccountUser } from 'store/account/hooks'
import { useDelegateStake } from 'store/actions/delegateStake'
import { useUserDelegation } from 'store/actions/userDelegation'
import { useUser } from 'store/cache/user/hooks'
import { Address, Operator, Status } from 'types'
import { TICKER } from 'utils/consts'
import { formatShortWallet, formatWeiNumber } from 'utils/format'
import { useModalControls } from 'utils/hooks'
import { checkWeiNumber, parseWeiNumber } from 'utils/numeric'

import styles from './DelegateStakeModal.module.css'

const messages = {
  title: 'Delegate to Operator',
  amountLabel: 'Delegate Amount',
  btn: 'Delegate',
  inputLabel: TICKER,
  delegateAudio: `Delegate ${TICKER}`,
  guidance:
    'Need some guidance? Visit the Audius help center for help and resources.',
  helpCenter: 'Help Center',
  nodeOperator: 'Node Operator',
  operatorFee: 'Operator Fee',
  enterAmount: 'Enter an amount',
  max: 'Max',
  noAudio: `You have no ${TICKER} available to delegate`,
  balanceExceeded: `Exceeds amount of ${TICKER} in wallet`,
  maxDelegationExceeded: "Exceeds this node's maximum delegation amount",
  minDelegationNotMet: "Will not meet this node's minimum delegation amount"
}

type OwnProps = {
  serviceOperatorWallet: Address
  isOpen: boolean
  onClose: () => void
}

type DelegateStakeModalProps = OwnProps

const DelegateStakeModal: React.FC<DelegateStakeModalProps> = ({
  serviceOperatorWallet,
  isOpen,
  onClose
}: DelegateStakeModalProps) => {
  const {
    min: minDelegation,
    max: maxDelegation,
    user: serviceUser
  } = useUserDelegation(serviceOperatorWallet)
  const { user: accountUser } = useAccountUser()
  const { audiusProfile } = useUser({
    wallet: serviceOperatorWallet
  })
  const [stakingBN, setStakingBN] = useState(new BN('0'))
  const [stakingAmount, setStakingAmount] = useState('')
  const deployerCut =
    (serviceUser as Operator)?.serviceProvider?.deployerCut ?? null
  const effectiveMax = BN.min(
    maxDelegation,
    accountUser?.audToken ?? maxDelegation
  )

  useEffect(() => {
    if (!isOpen) {
      setStakingAmount('')
      setStakingBN(new BN('0'))
    }
  }, [isOpen, setStakingAmount, setStakingBN])

  useEffect(() => {
    if (minDelegation && stakingBN.isZero()) {
      setStakingBN(minDelegation)
      setStakingAmount(AudiusClient.getAud(minDelegation).toString())
    }
  }, [minDelegation, stakingBN, setStakingAmount, setStakingBN])

  const onUpdateStaking = useCallback(
    (value: string) => {
      setStakingAmount(value)
      if (checkWeiNumber(value)) {
        setStakingBN(parseWeiNumber(value)!)
      }
    },
    [setStakingAmount]
  )

  const {
    isOpen: isConfirmationOpen,
    onClick: onOpenConfirmation,
    onClose: onCloseConfirmation
  } = useModalControls()

  const onDelegate = useCallback(() => {
    if (minDelegation.lte(stakingBN) && maxDelegation.gte(stakingBN)) {
      onOpenConfirmation()
    }
  }, [minDelegation, maxDelegation, stakingBN, onOpenConfirmation])

  const { status, delegateStake, error } = useDelegateStake(!isConfirmationOpen)

  useEffect(() => {
    if (status === Status.Success) {
      onCloseConfirmation()
      onClose()
    }
  }, [status, onCloseConfirmation, onClose])

  const onConfirm = useCallback(() => {
    delegateStake(serviceOperatorWallet, stakingBN)
  }, [serviceOperatorWallet, delegateStake, stakingBN])

  const topBox = <Delegating amount={stakingBN} />
  const bottomBox = (
    <ToOperator
      name={
        audiusProfile?.name ||
        serviceUser?.name ||
        formatShortWallet(serviceUser?.wallet ?? '')
      }
      wallet={serviceOperatorWallet}
    />
  )

  const isInputDisabled = accountUser?.audToken.isZero()

  let helperText: string | undefined
  if (accountUser?.audToken.isZero()) {
    helperText = messages.noAudio
  } else if (
    accountUser?.audToken != null &&
    stakingBN.gt(accountUser?.audToken)
  ) {
    helperText = messages.balanceExceeded
  } else if (maxDelegation && stakingBN.gt(maxDelegation)) {
    helperText = messages.maxDelegationExceeded
  } else if (minDelegation && stakingBN.lt(minDelegation)) {
    helperText = messages.minDelegationNotMet
  }
  const hasError = !!helperText

  return (
    <Modal
      title={messages.title}
      className={styles.container}
      wrapperClassName={styles.wrapperClassName}
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={true}
      dismissOnClickOutside={!isConfirmationOpen}
    >
      <Flex pt='xl' w='100%' direction='column' alignItems='center' gap='xl'>
        <InfoBox
          fullWidth
          description={messages.guidance}
          ctaText={messages.helpCenter}
          ctaHref='https://support.audius.co/help'
        />
        <Flex direction='column' gap='xl' w='100%' css={{ maxWidth: 480 }}>
          <Flex justifyContent='space-between' w='100%'>
            <Flex gap='s' direction='column'>
              <Flex inline gap='xs' alignItems='center'>
                <Text variant='body' size='m' strength='strong' color='subdued'>
                  {messages.nodeOperator}
                </Text>
                <NodeOperatorInfoTooltip color='subdued' />
              </Flex>
              <DelegateInfo clickable={false} wallet={serviceOperatorWallet} />
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
          <Flex gap='l' alignItems='center'>
            <TokenAmountInput
              label={messages.delegateAudio}
              isWhole={false}
              placeholder={messages.enterAmount}
              tokenLabel={TICKER}
              decimals={8}
              value={stakingAmount}
              error={hasError}
              disabled={isInputDisabled}
              onChange={(stringValue) => {
                onUpdateStaking(stringValue)
              }}
              helperText={helperText}
              max={AudiusClient.displayShortAud(maxDelegation)}
            />
            <Button
              onClick={() => {
                onUpdateStaking(formatWeiNumber(effectiveMax))
              }}
              isDisabled={isInputDisabled}
              className={styles.maxButton}
              text={messages.max.toUpperCase()}
              type={ButtonType.PRIMARY_ALT}
            />
          </Flex>
          <Flex justifyContent='center'>
            <Button
              isDisabled={
                !stakingAmount ||
                hasError ||
                stakingBN.isZero() ||
                status === Status.Loading ||
                isInputDisabled ||
                isConfirmationOpen
              }
              text={messages.btn}
              type={ButtonType.PRIMARY}
              onClick={onDelegate}
            />
          </Flex>
        </Flex>
      </Flex>
      <ConfirmTransactionModal
        showTwoPopupsWarning
        isOpen={isConfirmationOpen}
        onClose={onCloseConfirmation}
        onConfirm={onConfirm}
        topBox={topBox}
        bottomBox={bottomBox}
        status={status}
        error={error}
      />
    </Modal>
  )
}

export default DelegateStakeModal
