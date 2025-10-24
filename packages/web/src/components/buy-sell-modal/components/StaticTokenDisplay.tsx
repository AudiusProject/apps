import type { CoinInfo } from '@audius/common/store'
import { Flex } from '@audius/harmony'

import { TokenIcon } from '../TokenIcon'

type StaticTokenDisplayProps = {
  tokenInfo: CoinInfo
}

/**
 * A non-interactive token display component that shows the token icon and symbol
 * without any dropdown functionality. Used when artist-coins feature flag is disabled.
 */
export const StaticTokenDisplay = ({ tokenInfo }: StaticTokenDisplayProps) => {
  const { logoURI, icon } = tokenInfo
  return (
    <Flex
      alignItems='center'
      justifyContent='center'
      gap='s'
      alignSelf='stretch'
      border='default'
      pv='s'
      ph='m'
      borderRadius='s'
      h='unit16'
    >
      <TokenIcon logoURI={logoURI} icon={icon} size='2xl' hex />
    </Flex>
  )
}
