import { useDeveloperApps, DeveloperApp } from '@audius/common/api'
import { accountSelectors } from '@audius/common/store'
import { ModalContentText, IconPlus, Button } from '@audius/harmony'

import { Divider } from 'components/divider'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { Tooltip } from 'components/tooltip'
import { useSelector } from 'utils/reducer'

import { DeveloperAppListItem } from './DeveloperAppListItem'
import styles from './YourAppsPage.module.css'
import { CreateAppPageProps, CreateAppsPages } from './types'

const { getUserId } = accountSelectors

const maxAppsAllowed = 5

const messages = {
  title: 'Your Apps',
  description: 'Create your own apps using the Audius SDK.',
  yourAppsTitle: 'Your Apps',
  noApps: "You haven't created any apps yet.",
  newAppButton: 'New',
  maxAllowedApps: `Maximum of ${maxAppsAllowed} Apps Created`
}

type YourAppsPageProps = CreateAppPageProps

export const YourAppsPage = (props: YourAppsPageProps) => {
  const { setPage } = props
  const userId = useSelector(getUserId)
  const { data: apps, status } = useDeveloperApps(userId)

  const hasMaxAllowedApps = (apps?.length ?? 0) >= maxAppsAllowed

  let createAppButton = (
    <Button
      variant='secondary'
      size='small'
      iconLeft={IconPlus}
      onClick={() => setPage(CreateAppsPages.NEW_APP)}
      disabled={status !== 'success' || hasMaxAllowedApps}
    >
      {messages.newAppButton}
    </Button>
  )

  if (hasMaxAllowedApps) {
    createAppButton = (
      <Tooltip text={messages.maxAllowedApps}>
        <span>{createAppButton}</span>
      </Tooltip>
    )
  }

  return (
    <div className={styles.content}>
      <ModalContentText>{messages.description}</ModalContentText>
      <div>
        <div className={styles.appsHeader}>
          <h4 className={styles.appsHeaderText}>{messages.yourAppsTitle}</h4>
          {createAppButton}
        </div>
        <Divider className={styles.divider} />
        {status !== 'success' ? (
          <LoadingSpinner className={styles.spinner} />
        ) : !apps?.length ? (
          <p className={styles.noApps}>{messages.noApps}</p>
        ) : (
          <ol className={styles.appList}>
            {apps.map((app: DeveloperApp, index: number) => (
              <DeveloperAppListItem
                key={app.apiKey}
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
