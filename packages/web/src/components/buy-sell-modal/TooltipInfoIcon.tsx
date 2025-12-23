import { walletMessages } from '@audius/common/messages'
import {
  IconButton,
  IconInfo,
  Tooltip,
  TooltipPlacement
} from '@audius/harmony'
import { useTheme } from '@emotion/react'

import { zIndex } from 'utils/zIndex'

const messages = {
  text: walletMessages.cashBalanceTooltip
}

type TooltipInfoIconProps = {
  ariaLabel?: string
  size?: 's' | 'm' | 'l'
  color?: 'subdued' | 'default'
  placement?: TooltipPlacement
}

export const TooltipInfoIcon = ({
  ariaLabel = 'Information',
  size = 's',
  color = 'subdued',
  placement = 'left'
}: TooltipInfoIconProps) => {
  const { cornerRadius } = useTheme()

  return (
    <Tooltip
      text={messages.text}
      placement={placement}
      getPopupContainer={() => {
        // First try to find a modal content container to render within
        const modalContent =
          document.querySelector('[role="dialog"] [data-modal-content]') ||
          document.querySelector('[role="dialog"] .modal-content') ||
          document.querySelector('[role="dialog"]')
        if (modalContent) {
          return modalContent as HTMLElement
        }
        // Fall back to page or body
        return document.getElementById('page') ?? document.body
      }}
      shouldWrapContent={false}
      shouldDismissOnClick={false}
      zIndex={zIndex.CASH_WALLET_TOOLTIP}
    >
      <IconButton
        icon={IconInfo}
        size={size}
        color={color}
        activeColor='default'
        aria-label={ariaLabel}
        css={{ borderRadius: cornerRadius.circle }}
      />
    </Tooltip>
  )
}
