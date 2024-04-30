import { accountSelectors } from '@audius/common/store'
import { Text } from '@audius/harmony'

import { AvatarLegacy } from 'components/avatar/AvatarLegacy'
import { TextLink, UserLink } from 'components/link'
import { useSelector } from 'utils/reducer'
import { SIGN_IN_PAGE, profilePage } from 'utils/route'

import styles from './AccountDetails.module.css'
import { FeatureFlags } from '@audius/common/services'
import { useFlag } from 'hooks/useRemoteConfig'
import { AccountSwitcher } from './AccountSwitcher/AccountSwitcher'

const { getAccountUser } = accountSelectors

const messages = {
  haveAccount: 'Have an Account?',
  signIn: 'Sign in'
}

export const AccountDetails = () => {
  const account = useSelector((state) => getAccountUser(state))
  const { isEnabled: isManagerModeEnabled } = useFlag(FeatureFlags.MANAGER_MODE)

  const profileLink = profilePage(account?.handle ?? '')

  return (
    <div className={styles.userHeader}>
      <div className={styles.accountWrapper}>
        <AvatarLegacy userId={account?.user_id} />
        <div className={styles.userInfo}>
          {account ? (
            <>
              <UserLink
                textVariant='title'
                size='s'
                strength='weak'
                userId={account.user_id}
                badgeSize='xs'
              />
              <TextLink
                textVariant='body'
                size='xs'
                to={profileLink}
              >{`@${account.handle}`}</TextLink>
            </>
          ) : (
            <>
              <Text variant='body' size='s' strength='strong'>
                {messages.haveAccount}
              </Text>
              <TextLink
                to={SIGN_IN_PAGE}
                variant='visible'
                textVariant='body'
                size='xs'
                strength='weak'
              >
                {messages.signIn}
              </TextLink>
            </>
          )}
        </div>
        {isManagerModeEnabled && account ? <AccountSwitcher /> : null}
      </div>
    </div>
  )
}
