import { useEffect } from 'react'

import { MobileOS } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { connect } from 'react-redux'
import { useLocation } from 'react-router'
import { Dispatch } from 'redux'

import { getMobileOS } from 'utils/clientUtil'
import { push } from 'utils/navigation'

const {
  APP_REDIRECT,
  ANDROID_PLAY_STORE_LINK,
  IOS_WEBSITE_STORE_LINK,
  IOS_APP_STORE_LINK
} = route

type AppRedirectListenerProps = ReturnType<typeof mapDispatchToProps>

const EMBED_HASH = '#embed'

const AppRedirectListener = ({ goToRoute }: AppRedirectListenerProps) => {
  const location = useLocation()
  const { pathname } = location

  useEffect(() => {
    if (pathname.search(APP_REDIRECT) === -1) return

    const hash = window.location.hash
    if (hash === EMBED_HASH) {
      let hostname = window.location.hostname
      hostname = hostname.replace('redirect.', '')
      const path = pathname.replace(APP_REDIRECT, '')
      const newURL = `https://${hostname}${path}`
      window.location.href = newURL
      return
    }

    const os = getMobileOS()
    if (os === MobileOS.IOS) {
      window.location.href = IOS_APP_STORE_LINK
    } else if (os === MobileOS.ANDROID) {
      window.location.href = ANDROID_PLAY_STORE_LINK
    } else {
      window.location.href = IOS_WEBSITE_STORE_LINK
    }
  }, [pathname, goToRoute])

  return null
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    goToRoute: (route: string) => dispatch(push(route))
  }
}

export default connect(() => {}, mapDispatchToProps)(AppRedirectListener)
