import { createApp } from './app.js'
import { createAudiusSessionFactory } from './audius/session.js'
import { callbackUrl, loadConfig, mcpUrl } from './config.js'

const main = () => {
  const config = loadConfig()
  const { app, close } = createApp({
    config,
    createSession: createAudiusSessionFactory(config)
  })

  const server = app.listen(config.port, () => {
    console.log(`[audius-mcp] listening on port ${config.port}`)
    console.log(`[audius-mcp] MCP endpoint:         ${mcpUrl(config)}`)
    console.log(`[audius-mcp] Audius redirect URI:  ${callbackUrl(config)}`)
  })

  const shutdown = () => {
    close()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

try {
  main()
} catch (error) {
  console.error(
    `[audius-mcp] ${error instanceof Error ? error.message : String(error)}`
  )
  process.exit(1)
}
