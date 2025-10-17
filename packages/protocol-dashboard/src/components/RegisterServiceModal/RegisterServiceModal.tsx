import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Box, Flex, Text } from '@audius/harmony'
import { ButtonType } from '@audius/stems'
import BN from 'bn.js'
import clsx from 'clsx'

import Button from 'components/Button'
import ConfirmTransactionModal, {
  NewService,
  OperatorStaking
} from 'components/ConfirmTransactionModal'
import DisplayAudio from 'components/DisplayAudio'
import { InfoBox } from 'components/InfoBox/InfoBox'
import { OperatorStakeInfoTooltip } from 'components/InfoTooltip/InfoTooltips'
import Modal from 'components/Modal'
import TextField from 'components/TextField'
import { useDashboardWalletUser } from 'hooks/useDashboardWalletUsers'
import AudiusClient from 'services/Audius'
import { useAccount, useAccountUser } from 'store/account/hooks'
import { useRegisterService } from 'store/actions/registerService'
import { useServiceInfo } from 'store/cache/protocol/hooks'
import { ServiceType, Status } from 'types'
import getActiveStake from 'utils/activeStake'
import { TICKER } from 'utils/consts'
import { formatShortWallet } from 'utils/format'
import { useModalControls } from 'utils/hooks'
import { checkWeiNumber, parseWeiNumber } from 'utils/numeric'
import { REGISTER_NODE_DOCS_URL } from 'utils/routes'

import styles from './RegisterServiceModal.module.css'

const messages = {
  registerNode: 'Register Node',
  staking: 'Stake',
  stakingPlaceholder: `200,000 ${TICKER}`,
  endpoint: 'Node Endpoint',
  endpointPlaceholder: 'https://validator.audius.co',
  delegate: 'Node Wallet Address',
  learnMoreNode: 'To learn more about running a node, please read the docs.',
  runningAudiusNode: 'Running a Node',
  minStake: 'Min Stake',
  maxStakeExceeded: 'Exceeds maximum stake',
  minStakeNotMet: 'Does not meet minimum stake'
}

type RegisterServiceModalProps = {
  isOpen: boolean
  onClose: () => void
  defaultEndpoint?: string
  defaultDelegateOwnerWallet?: string
}

const RegisterServiceModal = ({
  isOpen,
  onClose,
  defaultEndpoint,
  defaultDelegateOwnerWallet
}: RegisterServiceModalProps) => {
  const { wallet } = useAccount()
  const serviceInfo = useServiceInfo()
  const { user } = useAccountUser()
  const { data: connectedAudiusUserData } = useDashboardWalletUser(user?.wallet)
  const calculatedMinStakeRef = useRef<BN>()

  // Check how much available stake the SP can use for registration
  // This computation is as follows:
  //
  // AVAILABLE_STAKE = ACTIVE_STAKE - USED_STAKE
  //   where
  //    ACTIVE_STAKE = amount that we have staked in audius
  //    USED_STAKE = # of services we have * minstake for each service
  let availableStake: BN | undefined
  if (
    user &&
    'serviceProvider' in user &&
    serviceInfo.contentNode &&
    serviceInfo.discoveryProvider &&
    serviceInfo.validator
  ) {
    let usedStake = new BN('0')

    if ('contentNodes' in user) {
      const numContentNodes = new BN(user.contentNodes.length)
      usedStake = usedStake.add(
        numContentNodes.mul(serviceInfo.contentNode.minStake)
      )
    }
    if ('discoveryProviders' in user) {
      const numDiscoveryNodes = new BN(user.discoveryProviders.length)
      usedStake = usedStake.add(
        numDiscoveryNodes.mul(serviceInfo.discoveryProvider.minStake)
      )
    }
    if ('validators' in user) {
      const numValidators = new BN(user.validators.length)
      usedStake = usedStake.add(
        numValidators.mul(serviceInfo.validator.minStake)
      )
    }

    const activeStake = getActiveStake(user)
    availableStake = activeStake.sub(usedStake)
  }

  const selectedServiceInfo = serviceInfo.contentNode

  // Our calculated min stake is the service type min stake MINUS
  // the "unused/available" stake we have in the system already.
  const calculatedMinStake = useMemo(() => {
    return selectedServiceInfo
      ? BN.max(
          selectedServiceInfo.minStake.sub(availableStake ?? new BN('0')),
          new BN('0')
        )
      : new BN('0')
  }, [selectedServiceInfo, availableStake])

  useEffect(() => {
    calculatedMinStakeRef.current = calculatedMinStake
  }, [calculatedMinStake])

  const [stakingBN, setStakingBN] = useState(calculatedMinStake)
  const [stakingAmount, setStakingAmount] = useState('')
  const [endpoint, setEndpoint] = useState(defaultEndpoint || '')
  const [delegateOwnerWallet, setDelegateOwnerWallet] = useState(
    defaultDelegateOwnerWallet || wallet || ''
  )

  useEffect(() => {
    if (isOpen && defaultDelegateOwnerWallet) {
      setDelegateOwnerWallet(defaultDelegateOwnerWallet)
    } else if (isOpen && wallet) {
      setDelegateOwnerWallet(wallet)
    }
  }, [isOpen, setDelegateOwnerWallet, wallet, defaultDelegateOwnerWallet])

  useEffect(() => {
    if (isOpen && selectedServiceInfo && calculatedMinStakeRef.current) {
      setStakingBN(calculatedMinStakeRef.current)
      const amount = AudiusClient.getAud(
        new BN(calculatedMinStakeRef.current as any)
      )
      setStakingAmount(amount.toString())
    }
  }, [
    isOpen,
    selectedServiceInfo,
    setStakingBN,
    setStakingAmount,
    calculatedMinStakeRef
  ])

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
    isOpen: isConfirmModalOpen,
    onClick: onOpenConfirm,
    onClose: onCloseConfirm
  } = useModalControls()

  const onRegister = useCallback(() => {
    // TODO: validate each field
    onOpenConfirm()
  }, [onOpenConfirm])

  const { status, registerService, error } =
    useRegisterService(!isConfirmModalOpen)

  const onConfirm = useCallback(() => {
    registerService(
      ServiceType.Validator,
      endpoint,
      stakingBN,
      delegateOwnerWallet
    )
  }, [registerService, endpoint, stakingBN, delegateOwnerWallet])

  useEffect(() => {
    if (status === Status.Success) {
      setDelegateOwnerWallet('')
      setEndpoint('')
      onCloseConfirm()
      onClose()
    }
  }, [status, onClose, onCloseConfirm, setEndpoint, setDelegateOwnerWallet])

  const onCloseRegisterModal = useCallback(() => {
    if (endpoint !== defaultEndpoint) setEndpoint('')
    onClose()
  }, [onClose, setEndpoint, endpoint, defaultEndpoint])

  const topBox = user && (
    <OperatorStaking
      name={
        connectedAudiusUserData?.user.name ||
        user.name ||
        formatShortWallet(user.wallet)
      }
      amount={stakingBN}
      wallet={user.wallet}
    />
  )
  const bottomBox = (
    <NewService delegateOwnerWallet={delegateOwnerWallet || user?.wallet} />
  )

  const min = calculatedMinStake
  const max = selectedServiceInfo?.maxStake
  const exceedsMaxStake = max && stakingBN.gt(max)
  const doesNotMeetMinStake = min && stakingBN.lt(min)
  const canSubmit = !(
    exceedsMaxStake ||
    doesNotMeetMinStake ||
    !endpoint ||
    !delegateOwnerWallet
  )

  return (
    <Modal
      title={messages.registerNode}
      className={styles.container}
      isOpen={isOpen}
      onClose={onCloseRegisterModal}
      isCloseable={true}
      dismissOnClickOutside={!isConfirmModalOpen}
    >
      <Box mt='xl' mb='xl'>
        <InfoBox
          description={messages.learnMoreNode}
          ctaHref={REGISTER_NODE_DOCS_URL}
          ctaText={messages.runningAudiusNode}
        />
      </Box>
      <Box css={{ maxWidth: 480 }}>
        <TextField
          value={endpoint}
          onChange={setEndpoint}
          label={messages.endpoint}
          placeholder={messages.endpointPlaceholder}
          className={styles.input}
        />
        <TextField
          value={delegateOwnerWallet}
          onChange={setDelegateOwnerWallet}
          label={messages.delegate}
          placeholder={defaultDelegateOwnerWallet || wallet || ''}
          className={styles.input}
        />
        <Flex gap='l' alignItems='flex-end' mb='xl'>
          <Flex direction='column' gap='xs' css={{ flexGrow: 1 }}>
            <TextField
              value={stakingAmount}
              isNumeric
              label={messages.staking}
              onChange={onUpdateStaking}
              rightLabel={TICKER}
              placeholder={messages.stakingPlaceholder}
              inputClassName={styles.stakeInput}
              className={clsx({
                [styles.invalid]: exceedsMaxStake || doesNotMeetMinStake
              })}
            />
            {exceedsMaxStake || doesNotMeetMinStake ? (
              <Text color='danger' variant='body' size='s'>
                {exceedsMaxStake
                  ? messages.maxStakeExceeded
                  : messages.minStakeNotMet}
              </Text>
            ) : null}
          </Flex>
          <Flex direction='column' alignItems='flex-end'>
            <Text variant='heading' size='s'>
              <DisplayAudio amount={min} />
            </Text>
            <Flex inline gap='xs' alignItems='center'>
              <Text variant='body' size='m' strength='strong' color='subdued'>
                {messages.minStake}
              </Text>
              <OperatorStakeInfoTooltip color='subdued' />
            </Flex>
          </Flex>
        </Flex>
      </Box>
      <Button
        isDisabled={!canSubmit}
        text={messages.registerNode}
        type={ButtonType.PRIMARY}
        onClick={onRegister}
      />
      <ConfirmTransactionModal
        showTwoPopupsWarning
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

export default RegisterServiceModal
