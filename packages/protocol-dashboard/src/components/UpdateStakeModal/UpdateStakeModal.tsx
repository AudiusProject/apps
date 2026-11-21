import React, { useCallback, useEffect, useState } from 'react'

import { Box, Flex, Text, TokenAmountInput } from '@audius/harmony'
import BN from 'bn.js'

import Button, { ButtonType } from 'components/Button'
import ConfirmTransactionModal, {
  NewStake,
  OldStake
} from 'components/ConfirmTransactionModal'
import DisplayAudio from 'components/DisplayAudio'
import Modal from 'components/Modal'
import { Position } from 'components/Tooltip'
import AudiusClient from 'services/Audius'
import {
  useAccountUser,
  useHasPendingDecreaseStakeTx
} from 'store/account/hooks'
import { useUpdateStake } from 'store/actions/updateStake'
import { Operator, Status } from 'types'
import { TICKER } from 'utils/consts'
import { checkWeiNumber, parseWeiNumber } from 'utils/numeric'

import styles from './UpdateStakeModal.module.css'

const messages = {
  title: 'Manage Stake',
  btn: 'Save Changes',
  currentStake: 'Current Stake',
  minStake: 'Minimum Stake',
  change: 'Change',
  newStakingAmount: 'New Stake Amount',
  stakingLabel: TICKER,
  oldStakeTitle: `Old Stake ${TICKER}`,
  newStakeTitle: `New Stake ${TICKER}`,
  maxAmountExceeded: 'Exceeds maximum amount',
  minAmountNotMet: 'Will not meet the required minimum stake',
  enterAmount: 'Enter Amount',
  decreaseStakeDisabledPendingDecrease:
    'Cannot decrease stake right now because you have a pending decrease stake transaction',
  increaseStakeDisabledDeployerStakeTooBig:
    'Cannot increase stake right now because it is currently at the maximum amount'
}

type OwnProps = {
  isOpen: boolean
  onClose: () => void
}

type UpdateStakeModalProps = OwnProps

const UpdateStakeModal: React.FC<UpdateStakeModalProps> = ({
  isOpen,
  onClose
}: UpdateStakeModalProps) => {
  const { status: userStatus, user: accountUser } = useAccountUser()
  if (userStatus === Status.Success && !('serviceProvider' in accountUser)) {
    onClose()
  }

  const [stakingBN, setStakingBN] = useState(new BN('0'))
  const [stakingAmount, setStakingAmount] = useState('0')
  const [hasRun, setHasRun] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setHasRun(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (
      userStatus === Status.Success &&
      'serviceProvider' in accountUser &&
      !hasRun
    ) {
      setHasRun(true)
      const deployerStake = (accountUser as Operator).serviceProvider
        .deployerStake
      setStakingBN(deployerStake)
      setStakingAmount(AudiusClient.getAud(deployerStake).toString())
    }
  }, [
    userStatus,
    accountUser,
    setStakingAmount,
    setStakingBN,
    hasRun,
    setHasRun
  ])

  const onUpdateStaking = useCallback(
    (value: string) => {
      setStakingAmount(value)
      if (checkWeiNumber(value)) {
        setStakingBN(parseWeiNumber(value)!)
      }
    },
    [setStakingAmount, setStakingBN]
  )

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const onCloseConfirm = useCallback(() => setIsConfirmModalOpen(false), [])

  const onSubmit = useCallback(() => {
    setIsConfirmModalOpen(true)
  }, [setIsConfirmModalOpen])

  const hasPendingDecreaseTxResult = useHasPendingDecreaseStakeTx()

  const deployerStake =
    (accountUser as Operator)?.serviceProvider?.deployerStake ?? new BN('0')
  const isIncrease = stakingBN.gt(deployerStake)

  const { status, updateStake, error } = useUpdateStake(
    isIncrease,
    !isConfirmModalOpen
  )

  const onConfirm = useCallback(() => {
    const deployerStake = (accountUser as Operator).serviceProvider
      .deployerStake

    if (isIncrease) {
      updateStake(stakingBN.sub(deployerStake))
    } else {
      updateStake(deployerStake.sub(stakingBN))
    }
  }, [isIncrease, updateStake, accountUser, stakingBN])

  useEffect(() => {
    if (status === Status.Success) {
      onCloseConfirm()
      onClose()
    }
  }, [status, onClose, onCloseConfirm])

  const oldStakeAmount =
    (accountUser as Operator)?.serviceProvider?.deployerStake ?? null
  const stakeDiff = oldStakeAmount
    ? isIncrease
      ? stakingBN.sub(oldStakeAmount)
      : oldStakeAmount.sub(stakingBN)
    : null

  const topBox = (
    <OldStake
      title={messages.oldStakeTitle}
      stakeDiff={stakeDiff}
      isIncrease={isIncrease}
      oldStakeAmount={oldStakeAmount}
    />
  )
  const bottomBox = (
    <NewStake title={messages.newStakeTitle} stakeAmount={stakingBN} />
  )

  const totalStakedFor =
    (accountUser as Operator)?.totalStakedFor ?? new BN('0')

  const stakeChange = stakingBN.sub(deployerStake)
  const minAccountStake = (accountUser as Operator)?.serviceProvider
    ?.minAccountStake
  const min = minAccountStake
  const max = (accountUser as Operator)?.serviceProvider?.maxAccountStake
    .sub(totalStakedFor)
    .add(deployerStake)

  const decreaseStakeDisabled =
    hasPendingDecreaseTxResult.status === Status.Success &&
    hasPendingDecreaseTxResult.hasPendingDecreaseTx
  const maxAccountStake =
    (accountUser as Operator)?.serviceProvider?.maxAccountStake ?? new BN('0')
  const increaseStakeDisabled =
    deployerStake.isZero() || deployerStake.gte(maxAccountStake)

  let errorText: string | undefined
  if (max && stakingBN.gt(max)) {
    errorText = messages.maxAmountExceeded
  } else if (min && stakingBN.lt(min)) {
    errorText = messages.minAmountNotMet
  } else if (decreaseStakeDisabled && !isIncrease && !stakeChange.isZero()) {
    errorText = messages.decreaseStakeDisabledPendingDecrease
  } else if (increaseStakeDisabled && isIncrease) {
    errorText = messages.increaseStakeDisabledDeployerStakeTooBig
  }
  const hasError = !!errorText

  return (
    <Modal
      title={messages.title}
      className={styles.container}
      wrapperClassName={styles.wrapperClassName}
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={true}
      dismissOnClickOutside={!isConfirmModalOpen}
    >
      <Flex direction='column' w='100%' pt='l' css={{ maxWidth: 480 }} gap='l'>
        <Box border='default' borderRadius='s'>
          <Flex
            pv='m'
            ph='xl'
            justifyContent='space-between'
            backgroundColor='surface1'
          >
            <Text variant='title' size='m'>
              {messages.currentStake}
            </Text>
            <Text variant='title' size='m'>
              <DisplayAudio amount={oldStakeAmount} />
            </Text>
          </Flex>
          <Flex
            pv='m'
            ph='xl'
            justifyContent='space-between'
            borderTop='default'
          >
            <Text variant='body' size='m'>
              {messages.minStake}
            </Text>
            <Text variant='body' size='m'>
              <DisplayAudio amount={minAccountStake} />
            </Text>
          </Flex>
        </Box>
        <Flex gap='l' alignItems='center'>
          <TokenAmountInput
            label={messages.newStakingAmount}
            isWhole={false}
            placeholder={messages.enterAmount}
            tokenLabel={TICKER}
            decimals={8}
            value={stakingAmount}
            error={hasError}
            onChange={(stringValue) => {
              onUpdateStaking(stringValue)
            }}
            helperText={errorText}
            max={max ? AudiusClient.displayShortAud(max) : undefined}
          />
          <Flex direction='column'>
            <Text variant='heading' size='s'>
              <DisplayAudio position={Position.BOTTOM} amount={stakeChange} />
            </Text>
            <Text variant='body' size='m'>
              {messages.change}
            </Text>
          </Flex>
        </Flex>
        <Flex justifyContent='center'>
          <Button
            isDisabled={
              !stakingAmount ||
              hasError ||
              stakingBN.isZero() ||
              isConfirmModalOpen ||
              stakeChange.isZero()
            }
            text={messages.btn}
            type={ButtonType.PRIMARY}
            onClick={onSubmit}
          />
        </Flex>
      </Flex>
      <ConfirmTransactionModal
        showTwoPopupsWarning={!stakeChange.isNeg()}
        isOpen={isConfirmModalOpen}
        onClose={onCloseConfirm}
        onConfirm={onConfirm}
        topBox={topBox}
        bottomBox={bottomBox}
        status={status}
        error={error}
      />
    </Modal>
  )
}

export default UpdateStakeModal
