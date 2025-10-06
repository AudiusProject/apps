import { ReactNode, useEffect, useState } from 'react'

import { Flex, FlexProps } from '@audius/harmony'

export const Frosted = ({
  children,
  ...props
}: { children: ReactNode } & FlexProps) => {
  // Only Safari & Chrome support the CSS
  // frosted glasss effect.
  const [isChromeOrSafari, setIsChromeOrSafari] = useState(false)

  useEffect(() => {
    const chromeOrSafari = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      return (
        userAgent.indexOf('chrome') > -1 || userAgent.indexOf('safari') > -1
      )
    }
    setIsChromeOrSafari(chromeOrSafari)
  }, [])
  return (
    <Flex
      column
      css={{
        backdropFilter: 'blur(10px)',
        zIndex: 10,
        position: 'relative',
        paddingInline: 'var(--harmony-unit-15)',
        // Need to set a different gradient for
        // browsers that don't support the
        // backdrop-filter frosted glass effect.
        background: isChromeOrSafari
          ? 'linear-gradient(180deg, var(--harmony-n-25) 0%, var(--harmony-n-25) 20%, var(--page-header-gradient-2) 65%)'
          : 'linear-gradient(180deg, var(--harmony-n-25) 0%, var(--page-n-25) 40%, var(--page-header-gradient-2-alt) 85%)'
      }}
      {...props}
    >
      {children}
    </Flex>
  )
}
