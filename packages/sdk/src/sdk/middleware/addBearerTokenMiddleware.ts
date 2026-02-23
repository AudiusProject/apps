import type {
  FetchParams,
  Middleware,
  RequestContext
} from '../api/generated/default'
import { Logger, type LoggerService } from '../services'

export const addBearerTokenMiddleware = (services: {
  bearerToken: string
  logger?: LoggerService
}): Middleware => {
  const bearerToken = services.bearerToken
  const logger = services.logger ?? new Logger()
  return {
    pre: async (context: RequestContext): Promise<FetchParams> => {
      const existingHeaders = context.init.headers as Record<string, string>
      if (existingHeaders.Authorization) {
        logger.warn(
          'Request already has an Authorization header. Skipping adding bearer token.'
        )
        return context
      }
      return {
        ...context,
        url: context.url,
        init: {
          ...context.init,
          headers: {
            ...context.init.headers,
            Authorization: `Bearer ${bearerToken}`
          }
        }
      }
    }
  }
}
