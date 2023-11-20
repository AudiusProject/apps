import { useCallback } from 'react'

import { Button, ButtonType, IconMetamask } from '@audius/harmony'

import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { userHasMetaMask } from 'pages/sign-up-page/utils/metamask'
import { FEED_PAGE } from 'utils/route'

const messages = {
  signIn: 'Sign In With MetaMask'
}

export const MetamaskSignInButton = () => {
  const navigate = useNavigateToPage()

  const handleClick = useCallback(() => {
    try {
      window.localStorage.setItem('useMetaMask', JSON.stringify(true))
    } catch (err) {
      console.error(err)
    }
    navigate(FEED_PAGE)
    window.location.reload()
  }, [navigate])

  if (!userHasMetaMask) return null

  return (
    <Button
      variant={ButtonType.SECONDARY}
      iconRight={IconMetamask}
      isStaticIcon
      onClick={handleClick}
    >
      {messages.signIn}
    </Button>
  )
}
