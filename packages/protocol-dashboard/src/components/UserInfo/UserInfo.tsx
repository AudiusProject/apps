import { useCallback, useEffect, useState } from 'react'

import { User as AudiusUser } from '@audius/sdk/services'
import { ButtonType } from '@audius/stems'
import BN from 'bn.js'
import clsx from 'clsx'
import { useSelector } from 'react-redux'

import IconSquareArrow from 'assets/img/iconSquareArrow.svg'
import Bounds from 'components/Bounds'
import Button from 'components/Button'
import ConfirmTransactionModal, {
  StandaloneBox
} from 'components/ConfirmTransactionModal'
import DelegateStakeModal from 'components/DelegateStakeModal'
import Loading from 'components/Loading'
import MyEstimatedRewards from 'components/MyEstimatedRewards'
import Paper from 'components/Paper'
import { BasicTooltip, Position } from 'components/Tooltip/Tooltip'
import UserImage from 'components/UserImage'
import { useAccount } from 'store/account/hooks'
import { useMakeClaim } from 'store/actions/makeClaim'
import useUndelegateStake from 'store/actions/undelegateStake'
import { usePendingClaim } from 'store/cache/claims/hooks'
import { getDelegatorInfo } from 'store/cache/protocol/hooks'
import { Operator, Status, User } from 'types'
import { TICKER } from 'utils/consts'
import { formatAud } from 'utils/format'
import { useModalControls } from 'utils/hooks'
import { createStyles } from 'utils/mobile'
import { AUDIUS_DAPP_URL } from 'utils/routes'

import UserBadges from './AudiusProfileBadges'
import desktopStyles from './UserInfo.module.css'
import mobileStyles from './UserInfoMobile.module.css'

const styles = createStyles({ desktopStyles, mobileStyles })

const messages = {
  delegate: 'DELEGATE',
  undelegate: 'UNDELEGATE',
  claim: 'CLAIM',
  makeClaim: 'Make Claim',
  claimOutOfBounds: 'Total stake out of bounds',
  delegatorLimitReached: 'This operator has reached its delegator limit'
}

type UserInfoProps = {
  className?: string
  user: User | Operator
  audiusProfile?: AudiusUser | null
  rank?: number
  isOwner: boolean
  delegates: BN
  services: number
  status: Status
  delegatesStatus: Status
}

const UserInfo = ({
  user,
  rank,
  isOwner,
  services,
  delegates,
  delegatesStatus,
  audiusProfile
}: UserInfoProps) => {
  // TODO: Get Rank
  const { name, wallet } = user
  const audiusProfileName = audiusProfile?.name
  const { isLoggedIn } = useAccount()
  const [isOpen, setIsOpen] = useState(false)
  const { maxDelegators } = useSelector(getDelegatorInfo)
  const onClick = useCallback(() => setIsOpen(true), [setIsOpen])
  const onClose = useCallback(() => setIsOpen(false), [setIsOpen])
  const { hasClaim, status: claimStatus } = usePendingClaim(wallet)
  const {
    status: makeClaimStatus,
    error: makeClaimError,
    makeClaim
  } = useMakeClaim()

  const onConfirmClaim = useCallback(() => {
    makeClaim(wallet)
  }, [wallet, makeClaim])

  useEffect(() => {
    if (makeClaimStatus === Status.Success) onClose()
  }, [makeClaimStatus, onClose])

  const {
    isOpen: isUndelegateOpen,
    onClick: onClickUndelegate,
    onClose: onCloseUndelegate
  } = useModalControls()
  const {
    status: undelegateStatus,
    error: undelegateError,
    undelegateStake
  } = useUndelegateStake()

  useEffect(() => {
    if (undelegateStatus === Status.Success) onCloseUndelegate()
  }, [undelegateStatus, onCloseUndelegate])

  const onConfirmUndelegate = useCallback(() => {
    undelegateStake(wallet, delegates)
  }, [undelegateStake, delegates, wallet])

  const undelegateBox = (
    <StandaloneBox>
      <div className={styles.boxLabel}>{`Undelegate ${TICKER}`}</div>
      <div className={clsx(styles.boxValue, styles.boxSpacing)}>
        {formatAud(delegates)}
      </div>
      <div className={styles.boxLabel}>{`Operator Name`}</div>
      <div className={clsx(styles.boxValue, styles.boxName)}>
        {name || wallet}
      </div>
    </StandaloneBox>
  )
  const isOperator = (user as Operator)?.serviceProvider ?? false
  const isValidBounds =
    (user as Operator)?.serviceProvider?.validBounds ?? false
  const makeClaimBox = <StandaloneBox> {messages.makeClaim} </StandaloneBox>
  const isDoneLoading =
    claimStatus === Status.Success && delegatesStatus === Status.Success
  const showDelegate =
    isLoggedIn &&
    services > 0 &&
    !isOwner &&
    isDoneLoading &&
    !hasClaim &&
    delegates.isZero() &&
    isValidBounds
  const showUndelegate =
    isLoggedIn && !isOwner && isDoneLoading && !hasClaim && !delegates.isZero()
  const showClaim =
    isLoggedIn && !isOwner && claimStatus === Status.Success && hasClaim

  const isClaimDisabled = !isValidBounds
  const isDelegatorLimitReached =
    maxDelegators !== undefined &&
    (user as Operator)?.delegators?.length >= maxDelegators

  return (
    <>
      {showDelegate && (
        <div className={styles.buttonContainer}>
          <BasicTooltip
            position={Position.TOP}
            text={messages.delegatorLimitReached}
            isDisabled={!isDelegatorLimitReached}
          >
            <Button
              text={messages.delegate}
              type={ButtonType.PRIMARY}
              isDisabled={isDelegatorLimitReached}
              onClick={onClick}
            />
          </BasicTooltip>
          <DelegateStakeModal
            serviceOperatorWallet={wallet}
            isOpen={isOpen}
            onClose={onClose}
          />
        </div>
      )}
      {showUndelegate && (
        <div className={styles.buttonContainer}>
          <Button
            className={styles.undelegateButton}
            text={messages.undelegate}
            type={ButtonType.PRIMARY}
            onClick={onClickUndelegate}
          />
          <ConfirmTransactionModal
            topBox={undelegateBox}
            onConfirm={onConfirmUndelegate}
            onClose={onCloseUndelegate}
            isOpen={isUndelegateOpen}
            error={undelegateError}
            status={undelegateStatus}
            withArrow={false}
          />
        </div>
      )}
      {showClaim && (
        <div className={styles.buttonContainer}>
          <BasicTooltip
            position={Position.TOP}
            text={messages.claimOutOfBounds}
            isDisabled={!isClaimDisabled}
          >
            <Button
              text={messages.claim}
              type={ButtonType.PRIMARY}
              onClick={onClick}
              isDisabled={isClaimDisabled}
            />
            <ConfirmTransactionModal
              isOpen={isOpen}
              withArrow={false}
              topBox={makeClaimBox}
              status={makeClaimStatus}
              error={makeClaimError}
              onConfirm={onConfirmClaim}
              onClose={onClose}
            />
          </BasicTooltip>
        </div>
      )}
      {rank && (
        <div className={styles.rankContainer}>
          <div className={styles.rankLabel}>{'Rank'}</div>
          <div className={styles.rankValue}>{rank}</div>
        </div>
      )}
      <div className={styles.imageContainer}>
        <UserImage
          className={styles.userImg}
          wallet={wallet}
          alt={'User Profile'}
        />
        {audiusProfile == null ? null : (
          <a
            aria-label="Go to user's Audius profile"
            target='_blank'
            rel='noreferrer'
            href={`${AUDIUS_DAPP_URL}/${audiusProfile?.handle}`}
          >
            <IconSquareArrow className={styles.externalLinkIcon} />
          </a>
        )}
      </div>
      <div className={styles.userName}>
        <span>{audiusProfileName ?? (name !== wallet && name)}</span>
        {audiusProfile ? (
          <UserBadges inline audiusProfile={audiusProfile} badgeSize={14} />
        ) : null}
      </div>
      <div className={styles.userWallet}>{wallet}</div>
      {isOperator && <Bounds wallet={wallet} />}
      <MyEstimatedRewards wallet={wallet} />
    </>
  )
}

const UserInfoContainer = (props: UserInfoProps) => {
  return (
    <Paper
      className={clsx(styles.userInfo, {
        [props.className!]: !!props.className
      })}
    >
      {props.status !== Status.Success ? <Loading /> : <UserInfo {...props} />}
    </Paper>
  )
}

export default UserInfoContainer
