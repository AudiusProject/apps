import { useAuthorizedApps } from '@audius/common/api'
import { ModalContentText, Divider } from '@audius/harmony'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'

import { AuthorizedAppListItem } from './AuthorizedAppListItem'
import styles from './YourAppsPage.module.css'
import { AuthorizedAppPageProps } from './types'

const messages = {
  description:
    'Manage the 3rd party apps that are allowed to modify your account.',
  yourAppsTitle: 'Authorized Apps',
  noApps: "You haven't connected any apps yet."
}

type YourAppsPageProps = AuthorizedAppPageProps

export const YourAppsPage = (props: YourAppsPageProps) => {
  const { setPage } = props
  const { data: apps, isPending } = useAuthorizedApps()

  return (
    <div className={styles.content}>
      <ModalContentText>{messages.description}</ModalContentText>
      <div>
        <div className={styles.appsHeader}>
          <h4 className={styles.appsHeaderText}>{messages.yourAppsTitle}</h4>
        </div>
        <Divider className={styles.divider} />
        {isPending ? (
          <LoadingSpinner className={styles.spinner} />
        ) : apps?.length === 0 ? (
          <p className={styles.noApps}>{messages.noApps}</p>
        ) : (
          <ol className={styles.appList}>
            {apps?.map((app, index) => (
              <AuthorizedAppListItem
                key={app.address}
                index={index + 1}
                app={app}
                setPage={setPage}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
