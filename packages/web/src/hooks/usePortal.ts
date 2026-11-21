import { ReactNode, useEffect, useMemo, useState } from 'react'

import { createPortal } from 'react-dom'

export const usePortal = ({ container }: { container?: HTMLElement }) => {
  const [portalContainer, setPortalContainer] = useState<
    HTMLElement | undefined
  >(container)

  useEffect(() => {
    if (!container) {
      const el = document.createElement('div')
      document.body.appendChild(el)
      setPortalContainer(el)
    } else {
      setPortalContainer(container)
    }
  }, [container, setPortalContainer])

  const Portal = useMemo(
    () =>
      ({ children }: { children: ReactNode }) =>
        portalContainer ? createPortal(children, portalContainer!) : null,
    [portalContainer]
  )
  return Portal
}
