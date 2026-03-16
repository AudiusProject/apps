import { AuthorizedApp } from '@audius/sdk/services'

export enum AuthorizedAppsPages {
  YOUR_APPS = 'your_apps',
  APP_DETAILS = 'app_details',
  REMOVE_APP = 'remove_app'
}

export type AuthorizedAppPageProps = {
  setPage: (page: AuthorizedAppsPages, params?: AuthorizedApp) => void
  params?: AuthorizedApp
}
