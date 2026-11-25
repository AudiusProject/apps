import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerArtistTools } from './artist.js'
import { createToolRegistrar, type ResolveContext } from './context.js'
import { registerListenerTools } from './listener.js'

export const registerTools = (
  server: McpServer,
  resolveContext: ResolveContext
) => {
  const tool = createToolRegistrar(server, resolveContext)
  registerListenerTools(tool)
  registerArtistTools(tool)
}
