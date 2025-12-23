import { ReactNode, useCallback, useContext } from 'react'

import { IconCopy, Tooltip } from '@audius/harmony'

import { ToastContext } from 'components/toast/ToastContext'
import { ComponentPlacement, MountPlacement } from 'components/types'
import { copyToClipboard } from 'utils/clipboardUtil'

import styles from './ClickableAddress.module.css'
import PurpleBox from './PurpleBox'

type DisplayAddressProps = {
  address: string
  className?: string
  isCompact?: boolean
  label?: ReactNode
}

const messages = {
  copy: 'Copy to Clipboard',
  copied: 'Copied to Clipboard',
  yourAddr: 'YOUR ADDRESS'
}

const ClickableAddress = ({
  address,
  className,
  label,
  isCompact = false
}: DisplayAddressProps) => {
  const { toast } = useContext(ToastContext)
  const onClickAddress = useCallback(() => {
    copyToClipboard(address)
    toast(messages.copied)
  }, [address, toast])

  return (
    <Tooltip
      text={messages.copy}
      placement={ComponentPlacement.TOP}
      mount={MountPlacement.PARENT}
    >
      <div className={className}>
        <PurpleBox
          label={label ?? messages.yourAddr}
          className={styles.container}
          onClick={onClickAddress}
          isCompact={isCompact}
          text={
            <div className={styles.addressContainer}>
              <div className={styles.address}>{address}</div>
              <IconCopy className={styles.icon} css={{ flexShrink: 0 }} />
            </div>
          }
        />
      </div>
    </Tooltip>
  )
}

export default ClickableAddress
