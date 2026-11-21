const RETRY_TIMEOUT_MS = 45 * 1000
const RETRY_DELAY_MS = 1000

module.exports = {
  waitForUser: async ({
    userId,
    handle,
    blockNumber: blocknumber,
    audiusLibsInstance,
    logger
  }) => {
    let retryCount = 0
    while (retryCount < RETRY_TIMEOUT_MS / RETRY_DELAY_MS) {
      try {
        logger.info({ userId, handle, blocknumber }, 'req')
        const u = await audiusLibsInstance.discoveryProvider._makeRequest(
          {
            endpoint: 'users',
            queryParams: { id: userId }
          },
          true,
          0,
          true,
          blocknumber
        )
        if (!u || !u[0]) {
          throw new Error('User not found')
        }
        return u[0]
      } catch (e) {
        if (
          e instanceof Error &&
          e.message.startsWith('Requested blocknumber')
        ) {
          logger.warn(
            { blocknumber, handle, userId, retryCount },
            'Block number not passed... waiting...'
          )
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          retryCount++
          continue
        }
        throw e
      }
    }
  }
}
