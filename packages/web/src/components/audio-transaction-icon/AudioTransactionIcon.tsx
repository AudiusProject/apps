import React, { ReactNode } from 'react'

import { TransactionType, TransactionMethod } from '@audius/common/store'
import {
  IconReceive as IconReceiveMini,
  IconSend as IconSendMini,
  IconTransaction,
  IconTrophy,
  IconComponent
} from '@audius/harmony'
import cn from 'classnames'

import AppIcon from 'assets/img/appIcon.png'
import IconCoinbaseMini from 'assets/img/iconCoinbaseMini.svg'
import IconStripeMini from 'assets/img/iconStripeMini.svg'

import styles from './AudioTransactionIcon.module.css'

type AudioTransactionIconProps = {
  type: TransactionType
  method: TransactionMethod
}

type IconProps = {
  type: TransactionType
  method: TransactionMethod
}

const typeIconSvgMap: Record<TransactionType, IconComponent | null> = {
  [TransactionType.CHALLENGE_REWARD]: IconTrophy,
  [TransactionType.PURCHASE]: null, // Not needed, AppLogo is used for purchases
  [TransactionType.TRANSFER]: IconTransaction,
  [TransactionType.TIP]: IconTransaction,
  [TransactionType.TRENDING_REWARD]: IconTrophy
} as const

const AppLogo = () => (
  <img src={AppIcon} alt={'Audius Logo'} width={40} height={40} />
)

const TypeIcon = ({ type, method }: IconProps) => {
  const IconSvg = typeIconSvgMap[type]

  return (
    <div className={cn(styles.icon, styles[method.toLowerCase()])}>
      {IconSvg && <IconSvg className={styles.iconSvg} />}
    </div>
  )
}

const typeIconMap: Record<
  TransactionType,
  React.FunctionComponent<IconProps>
> = {
  [TransactionType.CHALLENGE_REWARD]: TypeIcon,
  [TransactionType.PURCHASE]: AppLogo,
  [TransactionType.TRANSFER]: TypeIcon,
  [TransactionType.TIP]: TypeIcon,
  [TransactionType.TRENDING_REWARD]: TypeIcon
} as const

const methodIconMap: Record<TransactionMethod, ReactNode> = {
  [TransactionMethod.COINBASE]: <IconCoinbaseMini />,
  [TransactionMethod.RECEIVE]: <IconReceiveMini />,
  [TransactionMethod.SEND]: <IconSendMini />,
  [TransactionMethod.STRIPE]: <IconStripeMini />
} as const

export const AudioTransactionIcon = ({
  type,
  method
}: AudioTransactionIconProps) => {
  const Icon = typeIconMap[type]
  return (
    <div className={styles.transactionIcon}>
      <div
        className={cn(styles.transactionIconMini, styles[method.toLowerCase()])}
      >
        {methodIconMap[method]}
      </div>
      <Icon type={type} method={method} />
    </div>
  )
}
