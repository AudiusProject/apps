import { DeveloperAppsApi } from '../api/developer-apps/DeveloperAppsApi'
import {
  type Middleware,
  type RequestContext,
  type FetchParams,
  Configuration,
  querystring
} from '../api/generated/default'
import type { ServicesContainer } from '../types'
import fetch from '../utils/fetch'

let appName: string | undefined
let apiKey: string | undefined

/**
 * Appends the configured app_name to the query string for tracking API usage
 * @param options the middleware options
 * @param {string} options.appName the name of the app using the SDK
 */
export const addAppInfoMiddleware = ({
  apiKey: providedApiKey,
  appName: providedAppName,
  services,
  basePath
}: {
  apiKey?: string
  appName?: string
  services: ServicesContainer
  basePath: string
}): Middleware => {
  apiKey = providedApiKey
  appName = providedAppName
  return {
    pre: async (context: RequestContext): Promise<FetchParams> => {
      // If an app name is not provided, fetch the name from the dev app
      if (!providedAppName) {
        const apiClientConfig = new Configuration({
          fetchApi: fetch,
          basePath
        })
        const developerApps = new DeveloperAppsApi(
          apiClientConfig,
          services.entityManager
        )

        apiKey =
          providedApiKey ??
          (await services.audiusWalletClient.getAddresses())[0]
        if (apiKey) {
          appName = (
            await developerApps.getDeveloperApp({
              address: apiKey
            })
          ).data?.name
        }
      }

      if (!appName && !apiKey) {
        throw new Error('No appName or apiKey provided')
      }

      return {
        ...context,
        url:
          context.url +
          (context.url.includes('?') ? '&' : '?') +
          querystring({
            app_name: appName ?? '',
            api_key: apiKey ?? ''
          }),
        init: {
          ...context.init
        }
      }
    }
  }
}
