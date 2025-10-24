import React, { ReactNode } from 'react'

import { Box as HarmonyBox, Text } from '@audius/harmony'
import { ButtonType, IconArrow } from '@audius/stems'
import BN from 'bn.js'
import clsx from 'clsx'
import SimpleBar from 'simplebar-react'

import Button from 'components/Button'
import DisplayAudio from 'components/DisplayAudio'
import Loading from 'components/Loading'
import Modal from 'components/Modal'
import UserImage from 'components/UserImage'
import AudiusClient from 'services/Audius'
import { Address, BigNumber, Status } from 'types'
import { TICKER } from 'utils/consts'
import { sharedMessages } from 'utils/sharedMessages'

import styles from './ConfirmTransactionModal.module.css'

const messages = {
  title: 'Confirm Transaction',
  confirmCta: 'Confirm With Wallet',
  error: 'An Error Has Occured',
  okay: 'OKAY',
  discoveryProvider: 'Discovery Node',
  contentNode: 'Content Node',
  stakingAmount: `Staking Amount ${TICKER}`,
  newService: 'NEW SERVICES',
  delegateOwnerWallet: 'Node Wallet Address',
  oldStake: `Old Stake ${TICKER}`,
  newStake: `New Stake ${TICKER}`,
  delegatingAmount: `DELEGATING ${TICKER}`,
  undelegating: `UNDELEGATING ${TICKER}`,
  errorTitle: 'An Error Has Occured',
  errorHeader:
    'There was an error in executing the transaction. Please try again.',
  errorBtn: 'OKAY',
  from: 'From',
  to: 'To',
  operator: 'Operator'
}

type OperatorStakingProps = {
  className?: string
  image?: string
  name: string
  amount: BigNumber
  wallet: Address
}
export const OperatorStaking: React.FC<OperatorStakingProps> = (props) => {
  return (
    <Box
      className={clsx(styles.topBox, { [props.className!]: !!props.className })}
    >
      <UserImage
        alt={'User Profile'}
        wallet={props.wallet}
        className={clsx(styles.operatorStakingImage, styles.boxImage)}
      />
      <div className={styles.operatorStakingName}>{props.name}</div>
      <div className={styles.operatorStakingAmountLabel}>
        {messages.stakingAmount}
      </div>
      <div className={styles.boxValue}>
        <DisplayAudio amount={props.amount} />
      </div>
    </Box>
  )
}

type NewServiceProps = {
  className?: string
  delegateOwnerWallet: string
}
export const NewService: React.FC<NewServiceProps> = (props) => {
  return (
    <Box
      className={clsx(styles.bottomBox, {
        [props.className!]: !!props.className
      })}
    >
      <div className={styles.newServiceTitle}>{messages.newService}</div>
      <div className={styles.newServiceDelegateWallet}>
        {messages.delegateOwnerWallet}
      </div>
      <div className={styles.boxValue}>{props.delegateOwnerWallet}</div>
    </Box>
  )
}

type OldStakeProps = {
  className?: string
  title: string
  oldStakeAmount: BigNumber
  stakeDiff: BigNumber | null
  isIncrease: boolean
}
export const OldStake: React.FC<OldStakeProps> = (props) => {
  return (
    <Box
      className={clsx(styles.topBox, { [props.className!]: !!props.className })}
    >
      <div className={styles.stakeHeader}>{props.title}</div>
      <div className={clsx(styles.stakeValue, styles.stakeSpacing)}>
        {AudiusClient.displayAud(props.oldStakeAmount)}
      </div>
      <div
        className={clsx(styles.stakeValue, {
          [styles.increase]: props.isIncrease,
          [styles.decrease]: !props.isIncrease
        })}
      >
        {`${props.isIncrease ? '+' : '-'} ${AudiusClient.displayAud(
          props.stakeDiff ?? new BN('0')
        )}`}
      </div>
    </Box>
  )
}

type NewStakeProps = {
  className?: string
  title: string
  stakeAmount: BigNumber
}
export const NewStake: React.FC<NewStakeProps> = (props) => {
  return (
    <Box
      className={clsx(styles.bottomBox, {
        [props.className!]: !!props.className
      })}
    >
      <div className={styles.stakeHeader}>{props.title}</div>
      <div className={styles.stakeValue}>
        {AudiusClient.displayAud(props.stakeAmount)}
      </div>
    </Box>
  )
}

type DelegatingProps = {
  className?: string
  amount: BigNumber
  isUndelegating?: boolean
}
export const Delegating: React.FC<DelegatingProps> = (props) => {
  return (
    <Box
      className={clsx(styles.topBox, { [props.className!]: !!props.className })}
    >
      <div>
        {props.isUndelegating
          ? messages.undelegating
          : messages.delegatingAmount}
      </div>
      <div className={styles.delegatingAmount}>
        {AudiusClient.displayAud(props.amount)}
      </div>
    </Box>
  )
}

type StandaloneBoxProps = {
  className?: string
  children: ReactNode
}
export const StandaloneBox = ({ className, children }: StandaloneBoxProps) => {
  return (
    <Box
      className={clsx(styles.topBox, styles.standalone, {
        [className!]: !!className
      })}
    >
      {children}
    </Box>
  )
}

type ToOperatorProps = {
  className?: string
  name: string
  wallet: Address
  isFrom?: boolean
}
export const ToOperator = (props: ToOperatorProps) => {
  return (
    <Box
      className={clsx(styles.bottomBox, {
        [props.className!]: !!props.className
      })}
    >
      <HarmonyBox mb='m' css={{ textTransform: 'uppercase' }}>
        {props.isFrom ? messages.from : messages.to} {messages.operator}
      </HarmonyBox>
      <UserImage
        alt={'User Profile'}
        wallet={props.wallet}
        className={clsx(styles.boxImage, styles.toOperatorImg)}
      />
      <div className={styles.toOperatorName}>{props.name}</div>
      {props.wallet !== props.name ? (
        <div className={styles.toOperatorWallet}>{props.wallet}</div>
      ) : null}
    </Box>
  )
}

type BoxProps = {
  className?: string
  children: ReactNode
}
export const Box = ({ className, children }: BoxProps) => {
  return (
    <div className={clsx(styles.box, { [className!]: !!className })}>
      {children}
    </div>
  )
}

type OwnProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  topBox?: ReactNode
  bottomBox?: ReactNode
  withArrow?: boolean
  status?: Status
  error?: string
  showTwoPopupsWarning?: boolean
}

type ConfirmTransactionModalProps = OwnProps

const ConfirmTransactionModal: React.FC<ConfirmTransactionModalProps> = ({
  isOpen,
  onConfirm,
  onClose,
  topBox,
  withArrow = true,
  bottomBox,
  status,
  error,
  showTwoPopupsWarning
}: ConfirmTransactionModalProps) => {
  const formattedError = error.includes('\n') ? error.split('\n')[0] : error
  return (
    <Modal
      title={messages.title}
      className={styles.container}
      wrapperClassName={styles.wrapperClassName}
      isOpen={isOpen}
      onClose={onClose}
      isCloseable={status !== Status.Loading}
      dismissOnClickOutside={false}
    >
      {status !== Status.Failure ? (
        <>
          {!showTwoPopupsWarning ? null : (
            <HarmonyBox mt='xl'>
              <Text variant='heading' size='s' color='warning'>
                {sharedMessages.twoPopupsWarning}
              </Text>
            </HarmonyBox>
          )}
          {topBox}
          {withArrow && <IconArrow className={styles.arrowDown} />}
          {bottomBox}
          {!status && (
            <Button
              text={messages.confirmCta}
              type={ButtonType.PRIMARY}
              onClick={onConfirm}
            />
          )}
          {status === Status.Loading && (
            <div>
              <Loading className={styles.loading} />
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.errorHeader}>{messages.errorHeader}</div>
          <SimpleBar className={styles.scrollableMessage}>
            {formattedError}
          </SimpleBar>
          <Button
            text={messages.okay}
            type={ButtonType.PRIMARY}
            onClick={onClose}
          />
        </>
      )}
    </Modal>
  )
}

export default ConfirmTransactionModal
