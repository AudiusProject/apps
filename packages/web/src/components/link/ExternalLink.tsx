import { MouseEvent, ReactNode, useCallback } from 'react'

import { useLeavingAudiusModal } from '@audius/common/store'
import { isAllowedExternalLink } from '@audius/common/utils'

export type ExternalLinkProps = {
  to: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  ignoreWarning?: boolean
  children: ReactNode
}

export const ExternalLink = (props: ExternalLinkProps) => {
  const { to, onClick, ignoreWarning = false, children, ...other } = props

  const { onOpen: openLeavingAudiusModal } = useLeavingAudiusModal()

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event)
      if (to && !ignoreWarning && !isAllowedExternalLink(to)) {
        event.preventDefault()
        openLeavingAudiusModal({ link: to })
      }
    },
    [onClick, openLeavingAudiusModal, to, ignoreWarning]
  )

  return (
    <a
      target='_blank'
      rel='noreferrer'
      href={to}
      onClick={handleClick}
      {...other}
    >
      {children}
    </a>
  )
}
