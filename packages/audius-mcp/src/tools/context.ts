import type { AudiusSdk } from '@audius/sdk'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import type { Config } from '../config.js'

export type ToolContext = {
  sdk: AudiusSdk
  userId: string
  config: Config
}

export type ResolveContext = (authInfo: AuthInfo | undefined) => ToolContext

export const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: true
}

export const ADDITIVE_WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  openWorldHint: true
}

export const DESTRUCTIVE_WRITE: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  openWorldHint: true
}

export const pagination = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum number of results to return (1-50)'),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe('Number of results to skip, for paging')
}

const describeError = async (error: unknown) => {
  const response = (error as { response?: unknown } | null)?.response
  if (response instanceof Response) {
    const body = await response
      .clone()
      .text()
      .catch(() => '')
    let detail = body.slice(0, 500)
    try {
      const parsed = JSON.parse(body)
      detail =
        parsed.error_description ?? parsed.error ?? parsed.message ?? detail
    } catch {}
    if (response.status === 401) {
      return 'Audius rejected the request as unauthenticated. Reconnect the Audius connector and try again.'
    }
    return `Audius API error ${response.status}${detail ? `: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`
  }
  return error instanceof Error ? error.message : String(error)
}

type LooseRegisterTool = (
  name: string,
  config: Record<string, unknown>,
  callback: unknown
) => unknown

export const createToolRegistrar =
  (server: McpServer, resolveContext: ResolveContext) =>
  <Shape extends z.ZodRawShape>(
    name: string,
    definition: {
      title: string
      description: string
      inputSchema: Shape
      annotations: ToolAnnotations
    },
    handler: (
      args: z.objectOutputType<Shape, z.ZodTypeAny>,
      context: ToolContext
    ) => Promise<unknown>
  ) => {
    const callback = async (
      args: z.objectOutputType<Shape, z.ZodTypeAny>,
      extra: { authInfo?: AuthInfo }
    ) => {
      try {
        const result = await handler(args, resolveContext(extra.authInfo))
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) }
          ]
        }
      } catch (error) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: await describeError(error) }]
        }
      }
    }
    ;(server as unknown as { registerTool: LooseRegisterTool }).registerTool(
      name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: { title: definition.title, ...definition.annotations }
      },
      callback
    )
  }

export type RegisterTool = ReturnType<typeof createToolRegistrar>
