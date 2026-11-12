import { useCurrentAccountUser } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Button, IconFacebook, Text } from '@audius/harmony'

import { env } from 'services/env'

import styles from './FbSharePage.module.css'

const messages = {
  share: 'Share your profile with your friends on Facebook!',
  button: 'Share to Facebook',
  signIn: 'Log in to share your Audius profile',
  privacy: 'Privacy Policy'
}

export const FbSharePage = () => {
  const { data: handle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const shareParams = new URLSearchParams({
    app_id: env.FACEBOOK_APP_ID,
    display: 'popup',
    href: `https://${env.PUBLIC_HOSTNAME}/${encodeURIComponent(handle ?? '')}`,
    redirect_uri: `https://${env.PUBLIC_HOSTNAME}/fb/share`
  })

  return (
    <div className={styles.root}>
      <Text>{messages.share}</Text>
      <div className={styles.share}>
        {handle ? (
          <Button asChild iconLeft={IconFacebook}>
            <a
              href={`https://www.facebook.com/dialog/share?${shareParams}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              {messages.button}
            </a>
          </Button>
        ) : (
          <a href={route.SIGN_IN_PAGE}>{messages.signIn}</a>
        )}
      </div>
      <div className={styles.share}>
        <a href={route.PRIVACY_POLICY}>{messages.privacy}</a>
      </div>
    </div>
  )
}
