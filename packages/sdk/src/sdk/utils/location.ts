import { LoggerService } from '../services'

const ipApi = 'https://ipapi.co/json/'

type Location = {
  city: string
  region: string
  country: string
}

/**
 * Helper to get location. Intended for client-side use only from unique
 * requesters.
 * @param logger
 * @returns { city, region, country}
 */
export const getLocation = async ({
  logger
}: { logger?: LoggerService } = {}): Promise<Location | null> => {
  try {
    const res = await fetch(ipApi)
    const { city, region, country_name } = await res.json()
    return {
      city,
      region,
      country: country_name
    }
  } catch (e) {
    logger?.error(e)
    return null
  }
}
