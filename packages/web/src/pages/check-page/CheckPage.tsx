import { useCallback, useEffect, useRef, useState } from 'react'

import { useAccountStatus, useCurrentAccountUser } from '@audius/common/api'
import { Status } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { usePlaidLink, PlaidLinkError } from 'react-plaid-link'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'

import Page from 'components/page/Page'
import { identityService } from 'services/audius-sdk/identity'
import { push as pushRoute } from 'utils/navigation'

import './CheckPage.module.css'

const { SIGN_IN_PAGE, SETTINGS_PAGE } = route

const CheckPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const { data: accountStatus } = useAccountStatus()

  useEffect(() => {
    if (accountStatus !== Status.LOADING && !accountHandle) {
      dispatch(pushRoute(SIGN_IN_PAGE))
    }
  }, [accountHandle, accountStatus, dispatch])

  const [linkToken, setLinkToken] = useState<string | null>(null)
  const wasSuccessful = useRef(false)

  useEffect(() => {
    async function fetchLinkToken() {
      const { linkToken } = await identityService.createPlaidLinkToken()
      setLinkToken(linkToken)
    }
    fetchLinkToken()
  }, [])

  const onSuccess = useCallback(() => {
    wasSuccessful.current = true
    setTimeout(() => {
      navigate(`${SETTINGS_PAGE}?verification=success`)
    }, 500)
  }, [navigate])

  const onExit = useCallback(
    (err: PlaidLinkError | null) => {
      alert('onExit')
      if (err) {
        navigate(`${SETTINGS_PAGE}?verification=error`)
      } else if (wasSuccessful.current) {
        navigate(`${SETTINGS_PAGE}?verification=success`)
      } else {
        navigate(SETTINGS_PAGE)
      }
    },
    [navigate]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit
  })

  useEffect(() => {
    if (ready) {
      const originalWidth = document.body.style.width
      document.body.style.setProperty('width', '100%', 'important')
      open()
      return () => {
        document.body.style.width = originalWidth
      }
    }
  }, [ready, open])

  return <Page title='Verification' description='Audius account verification' />
}

export default CheckPage
