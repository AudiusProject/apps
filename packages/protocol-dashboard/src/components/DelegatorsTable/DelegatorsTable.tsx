import React, { useCallback } from 'react'

import BN from 'bn.js'
import clsx from 'clsx'

import DelegatorsModal from 'components/DelegatorsModal'
import DisplayAudio from 'components/DisplayAudio'
import Table from 'components/Table'
import UserImage from 'components/UserImage'
import UserName from 'components/UserName'
import { useUser, useDelegators } from 'store/cache/user/hooks'
import { Operator, Address, Delegate } from 'types'
import { usePushRoute } from 'utils/effects'
import { useModalControls } from 'utils/hooks'
import { accountPage } from 'utils/routes'

import styles from './DelegatorsTable.module.css'

const messages = {
  title: 'Delegators',
  modalTitle: 'Delegators',
  viewMore: 'View All Delegators',
  removeDelegator: 'Remove Delegator'
}

const limit = 5

type Delegator = {
  img: string
  address: Address
  name: string | undefined
  amount: BN
  activeAmount: BN
}

type OwnProps = {
  className?: string
  wallet: string
}
type DelegatorsTableProps = OwnProps

const DelegatorsTable: React.FC<DelegatorsTableProps> = ({
  className,
  wallet
}: DelegatorsTableProps) => {
  const { delegators } = useDelegators({ wallet })
  const { user } = useUser({ wallet })

  const pushRoute = usePushRoute()
  const data = (delegators as Delegate[]).map((delegator) => {
    return {
      img: delegator.img,
      name: delegator.name,
      address: delegator.wallet,
      amount: delegator.amount,
      activeAmount: delegator.activeAmount
    }
  })

  const columns = [
    { title: 'Amount Delegated', className: styles.amountHeader }
  ]

  const renderRow = (data: Delegator) => {
    return (
      <div className={styles.rowContainer}>
        <UserImage
          className={clsx(styles.rowCol, styles.colImg)}
          wallet={data.address}
          alt={'User Profile'}
        />
        <UserName
          className={clsx(styles.rowCol, styles.colAddress)}
          wallet={data.address}
        />
        <DisplayAudio
          className={clsx(styles.rowCol, styles.colAmount)}
          amount={data.activeAmount}
        />
      </div>
    )
  }

  const onRowClick = useCallback(
    (row: Delegator) => {
      pushRoute(accountPage(row.address))
    },
    [pushRoute]
  )

  const { isOpen, onClick: onClickMore, onClose } = useModalControls()

  const label = `Deployer Cut ${
    (user as Operator).serviceProvider.deployerCut
  }%`

  return (
    <>
      <Table
        className={className}
        title={messages.title}
        label={label}
        columns={columns}
        data={data}
        limit={limit}
        renderRow={renderRow}
        onRowClick={onRowClick}
        onClickMore={onClickMore}
        moreText={messages.viewMore}
        alwaysShowMore
      />
      <DelegatorsModal isOpen={isOpen} onClose={onClose} wallet={wallet} />
    </>
  )
}

export default DelegatorsTable
