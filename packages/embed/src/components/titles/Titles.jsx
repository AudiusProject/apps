import { AUDIO } from '@audius/fixed-decimal'
import {
  Flex,
  Artwork,
  IconVerified,
  IconTokenBronze,
  IconTokenSilver,
  IconTokenGold,
  IconTokenPlatinum
} from '@audius/harmony'

import { getCopyableLink } from '../../util/shareUtil'

import styles from './Titles.module.css'

const badgeTiers = [
  {
    tier: 'platinum',
    icon: IconTokenPlatinum,
    amount: AUDIO('10000').value
  },
  {
    tier: 'gold',
    icon: IconTokenGold,
    amount: AUDIO('1000').value
  },
  {
    tier: 'silver',
    icon: IconTokenSilver,
    amount: AUDIO('100').value
  },
  {
    tier: 'bronze',
    icon: IconTokenBronze,
    amount: AUDIO('10').value
  }
]

const getTierIcon = (balance) => {
  const balanceWei = BigInt(balance)
  const index = badgeTiers.findIndex((t) => t.amount <= balanceWei)
  const tier = index === -1 ? null : badgeTiers[index]
  return tier ? tier.icon : null
}

const Titles = ({
  title,
  handle,
  artistName,
  titleUrl,
  isVerified,
  artistCoinLogo,
  balance
}) => {
  const onClickTitle = () => {
    window.open(getCopyableLink(titleUrl), '_blank')
  }

  const onClickArtist = () => {
    window.open(getCopyableLink(handle), '_blank')
  }

  return (
    <div className={styles.titles}>
      <h1 className={styles.title} onClick={onClickTitle}>
        {title}
      </h1>
      <h2 className={styles.artistName} onClick={onClickArtist}>
        {artistName}
        <Flex alignItems='center' gap='xs'>
          {isVerified && <IconVerified size='s' />}
          {balance &&
            (() => {
              const Icon = getTierIcon(balance)
              return Icon ? <Icon height={17} width={17} /> : null
            })()}
          {artistCoinLogo && (
            <Artwork src={artistCoinLogo} hex h={18} w={18} borderWidth={0} />
          )}
        </Flex>
      </h2>
    </div>
  )
}

export default Titles
