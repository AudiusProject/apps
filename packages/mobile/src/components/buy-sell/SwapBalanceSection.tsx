import type { CoinInfo } from '@audius/common/store'

import { CryptoBalanceSection } from './CryptoBalanceSection'
import { USDCBalanceSection } from './USDCBalanceSection'

type SwapBalanceSectionProps = {
  title: string
  tokenInfo: CoinInfo
  amount: string
}

export const SwapBalanceSection = (props: SwapBalanceSectionProps) => {
  const { title, tokenInfo, amount } = props
  if (tokenInfo.symbol === 'USDC') {
    return <USDCBalanceSection title={title} amount={amount} />
  }
  return (
    <CryptoBalanceSection
      title={title}
      tokenInfo={tokenInfo}
      name={tokenInfo.name}
      amount={amount}
    />
  )
}
