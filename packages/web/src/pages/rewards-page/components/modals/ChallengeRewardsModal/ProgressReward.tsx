import { formatNumberCommas } from '@audius/common/utils'
import { Flex, Text } from '@audius/harmony'

import styles from './styles.module.css'

export const ProgressReward = ({
  amount,
  subtext
}: {
  amount?: number
  subtext?: string
}) => {
  return (
    <Flex p='xl' column>
      <Text
        variant='display'
        strength='strong'
        className={styles.rewardAmount}
        textAlign='center'
      >
        {formatNumberCommas(amount ?? '')}
      </Text>
      {subtext && (
        <Text variant='label' size='l' color='subdued' textAlign='center'>
          {subtext}
        </Text>
      )}
    </Flex>
  )
}

type DefaultRewardProps = {
  amount?: number
  subtext?: string
}

export const DefaultReward = ({ amount, subtext }: DefaultRewardProps) => {
  return <ProgressReward amount={amount} subtext={subtext} />
}
