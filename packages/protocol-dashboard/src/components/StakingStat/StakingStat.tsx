import React from 'react'

import BN from 'bn.js'
import clsx from 'clsx'

import DisplayAudio from 'components/DisplayAudio'
import InlineStat from 'components/InlineStat/InlineStat'
import StatsChip, { Divider } from 'components/StatsChip/StatsChip'
import { Position } from 'components/Tooltip'
import { Status } from 'types'
import { TICKER } from 'utils/consts'
import { formatWei } from 'utils/format'

import styles from './StakingStat.module.css'

const messages = {
  staked: `Staked ${TICKER}`,
  delegators: 'Delegators',
  services: 'Services',
  delegated: `${TICKER} Delegated`,
  discoveryNodes: 'Discovery Nodes',
  contentNodes: 'Content Nodes'
}

type OwnProps = {
  className?: string
  staked: BN
  numDiscoveryNodes: number
  totalDelegates: BN
  numContentNodes: number
  totalDelegatesStatus: Status
  isLoading: boolean
}

type StakingStatInfoProps = OwnProps

const StakingStatInfo: React.FC<StakingStatInfoProps> = ({
  className,
  totalDelegates,
  totalDelegatesStatus,
  staked,
  numContentNodes,
  numDiscoveryNodes,
  isLoading
}) => {
  const hasDelegates =
    totalDelegatesStatus === Status.Success && !totalDelegates.isZero()
  return (
    <StatsChip
      className={clsx({
        [className!]: !!className,
        [styles.delegatesContainer]: hasDelegates
      })}
      tooltipText={formatWei(staked)}
      amount={staked}
      primaryStatName={messages.staked}
      isLoading={isLoading}
    >
      <InlineStat
        label={messages.discoveryNodes}
        value={numDiscoveryNodes.toString()}
      />
      <InlineStat
        label={messages.contentNodes}
        value={numContentNodes.toString()}
      />
      {hasDelegates && (
        <>
          <Divider className={styles.delegatesDivider} />
          <div className={styles.delegatedContainer}>
            <div className={styles.delegatedLabel}>{messages.delegated}</div>
            <DisplayAudio
              position={Position.BOTTOM}
              className={styles.delegatedValue}
              amount={totalDelegates}
              shortFormat
            />
          </div>
        </>
      )}
    </StatsChip>
  )
}

export default StakingStatInfo
