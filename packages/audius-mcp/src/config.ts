import { z } from 'zod'

const EnvSchema = z.object({
  AUDIUS_API_KEY: z
    .string({ required_error: 'AUDIUS_API_KEY is required' })
    .min(1, 'AUDIUS_API_KEY is required'),
  PUBLIC_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().positive().default(3333),
  AUDIUS_ENVIRONMENT: z
    .enum(['development', 'production'])
    .default('production'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(100)
})

export type Config = {
  apiKey: string
  publicUrl: string
  port: number
  environment: 'development' | 'production'
  maxUploadBytes: number
}

export const loadConfig = (
  env: Record<string, string | undefined> = process.env
): Config => {
  const parsed = EnvSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid configuration — ${problems}`)
  }
  const { data } = parsed
  const publicUrl = (
    data.PUBLIC_URL ?? `http://localhost:${data.PORT}`
  ).replace(/\/+$/, '')
  return {
    apiKey: data.AUDIUS_API_KEY,
    publicUrl,
    port: data.PORT,
    environment: data.AUDIUS_ENVIRONMENT,
    maxUploadBytes: Math.floor(data.MAX_UPLOAD_MB * 1024 * 1024)
  }
}

export const callbackUrl = (config: Pick<Config, 'publicUrl'>) =>
  `${config.publicUrl}/callback`

export const mcpUrl = (config: Pick<Config, 'publicUrl'>) =>
  `${config.publicUrl}/mcp`
