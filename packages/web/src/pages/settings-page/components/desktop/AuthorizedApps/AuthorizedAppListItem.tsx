import { useCallback, useMemo } from 'react'

import {
  IconButton,
  IconEmbed,
  IconKebabHorizontal,
  IconTrash,
  IconVisibilityPublic,
  PopupMenu,
  PopupMenuItem
} from '@audius/harmony'
import { AuthorizedApp } from '@audius/sdk/services'

import PreloadImage from 'components/preload-image/PreloadImage'

import styles from './AuthorizedAppListItem.module.css'
import { AuthorizedAppPageProps, AuthorizedAppsPages } from './types'

const messages = {
  appActionsLabel: 'developer app actions',
  viewDetails: 'View Details',
  removeApp: 'Remove App'
}

type AuthorizedAppListItemProps = Pick<AuthorizedAppPageProps, 'setPage'> & {
  index: number
  app: AuthorizedApp
}

export const AuthorizedAppListItem = (props: AuthorizedAppListItemProps) => {
  const { app, setPage } = props
  const { name, imageUrl } = app

  const handleViewDetails = useCallback(() => {
    setPage(AuthorizedAppsPages.APP_DETAILS, app)
  }, [setPage, app])

  const handleRemoveApp = useCallback(() => {
    setPage(AuthorizedAppsPages.REMOVE_APP, app)
  }, [setPage, app])

  const divider = <hr className={styles.listItemDivider} />

  const menuItems: PopupMenuItem[] = useMemo(
    () => [
      {
        icon: <IconVisibilityPublic />,
        text: messages.viewDetails,
        onClick: handleViewDetails
      },
      {
        icon: <IconTrash />,
        text: messages.removeApp,
        onClick: handleRemoveApp
      }
    ],
    [handleViewDetails, handleRemoveApp]
  )

  return (
    <li className={styles.listItem}>
      <span className={styles.listItemImage}>
        {imageUrl ? (
          <PreloadImage src={imageUrl} />
        ) : (
          <IconEmbed color='subdued' size='2xl' />
        )}
      </span>
      {divider}
      <span className={styles.listItemAppName}>{name}</span>
      {divider}
      <span className={styles.listItemOptions}>
        <PopupMenu
          items={menuItems}
          renderTrigger={(ref, onClick, triggerProps) => (
            <IconButton
              // @ts-ignore
              ref={ref}
              {...triggerProps}
              aria-label={messages.appActionsLabel}
              color='subdued'
              size='m'
              icon={IconKebabHorizontal}
              onClick={() => onClick()}
            />
          )}
        />
      </span>
    </li>
  )
}
