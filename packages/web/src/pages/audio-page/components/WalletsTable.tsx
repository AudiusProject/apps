import { useCallback, useContext, useMemo, type ReactNode } from 'react'

import { useConnectedWallets, useWalletAudioBalance } from '@audius/common/api'
import { Chain } from '@audius/common/models'
import { shortenSPLAddress, shortenEthAddress } from '@audius/common/utils'
import type { AudioWei } from '@audius/fixed-decimal'
import {
  IconCopy,
  IconLogoCircleETH,
  IconLogoCircleSOL,
  Text,
  PopupMenu,
  PopupMenuItem,
  IconTrash,
  IconButton,
  IconKebabHorizontal,
  Flex
} from '@audius/harmony'
import cn from 'classnames'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { useWithMobileStyle } from 'hooks/useWithMobileStyle'
import { copyToClipboard } from 'utils/clipboardUtil'

import DisplayAudio from './DisplayAudio'
import styles from './WalletsTable.module.css'

const COPIED_TOAST_TIMEOUT = 2000
const WALLET_COUNT_LIMIT = 5

const messages = {
  copied: 'Copied To Clipboard!',
  audio: '$AUDIO',
  copy: 'Copy Wallet Address',
  remove: 'Remove Wallet',
  options: 'Options'
}

type WalletProps = {
  chain: Chain
  address: string
  isPending?: boolean
  showActionMenu?: boolean
  onRemove?: (props: { address: string; chain: Chain }) => void
}

export const WalletTableRow = ({
  chain,
  address,
  isPending: isMutationPending,
  showActionMenu,
  onRemove
}: WalletProps) => {
  const isMobile = useIsMobile()
  const displayAddress =
    chain === Chain.Eth ? shortenEthAddress : shortenSPLAddress
  const { toast } = useContext(ToastContext)
  const copyAddressToClipboard = useCallback(() => {
    copyToClipboard(address)
    toast(messages.copied, COPIED_TOAST_TIMEOUT)
  }, [address, toast])
  const items: PopupMenuItem[] = useMemo(
    () =>
      [
        {
          text: messages.copy,
          icon: <IconCopy />,
          onClick: copyAddressToClipboard
        },
        {
          text: messages.remove,
          icon: <IconTrash />,
          onClick: () => onRemove?.({ address, chain })
        }
      ].filter(Boolean) as PopupMenuItem[],
    [copyAddressToClipboard, onRemove, address, chain]
  )

  const { data: audioBalance, isPending: isBalancePending } =
    useWalletAudioBalance({
      chain,
      address,
      includeStaked: true
    })

  const isPending = isBalancePending || isMutationPending

  return (
    <div className={cn(styles.copyContainer)}>
      <Flex alignItems='center' gap='s'>
        {chain === Chain.Eth ? <IconLogoCircleETH /> : <IconLogoCircleSOL />}
        <Text variant='body' size='m' strength='strong'>
          {displayAddress(address)}
        </Text>
      </Flex>
      {!isMobile && !isPending ? (
        <Text
          variant='body'
          size='m'
          strength='strong'
          css={{ flex: 1, textAlign: 'right' }}
        ></Text>
      ) : null}
      <div className={cn(styles.audioBalance, styles.walletText)}>
        {!isPending ? (
          <DisplayAudio
            showLabel={false}
            amount={audioBalance ?? (BigInt(0) as AudioWei)}
            className={styles.balanceContainer}
            tokenClassName={styles.balance}
          />
        ) : null}
      </div>
      <Flex pl='l' css={{ marginLeft: 'auto', flexBasis: 0 }}>
        {isPending ? (
          <LoadingSpinner css={{ width: 24, height: 24 }}></LoadingSpinner>
        ) : null}
        {showActionMenu && !isPending ? (
          <PopupMenu
            items={items}
            renderTrigger={(ref, trigger) => (
              <IconButton
                ref={ref}
                icon={IconKebabHorizontal}
                size='s'
                color='subdued'
                onClick={() => trigger()}
                aria-label={messages.options}
              />
            )}
          />
        ) : null}
      </Flex>
    </div>
  )
}

type WalletsTableProps = {
  className?: string
  showWalletActionMenus?: boolean
  renderWallet?: (props: {
    address: string
    chain: Chain
    isPending?: boolean
  }) => ReactNode
}

const WalletsTable = ({
  renderWallet = (props) => <WalletTableRow key={props.address} {...props} />,
  showWalletActionMenus = false,
  className
}: WalletsTableProps) => {
  const wm = useWithMobileStyle(styles.mobile)

  const { data: connectedWallets } = useConnectedWallets()

  const numConnectedWallets = connectedWallets?.length ?? 0
  return (
    <div
      className={wm(styles.container, {
        [className!]: !!className,
        [styles.noActions]: !showWalletActionMenus
      })}
    >
      <div className={styles.walletsHeader}>
        <Text variant='label' size='m' strength='strong' color='subdued'>
          {`(${numConnectedWallets}/${WALLET_COUNT_LIMIT})`}
        </Text>
        <Text variant='label' size='m' strength='strong' color='subdued'>
          {messages.audio}
        </Text>
      </div>
      {connectedWallets?.map(renderWallet)}
    </div>
  )
}

export default WalletsTable
