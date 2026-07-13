import { describe, expect, it } from 'vitest'

import { env } from './env.prod'

describe('production env', () => {
  it('uses HTTPS for the Discord bot server', () => {
    expect(env.DISCORD_BOT_SERVER).toBe('https://discord.audius.co')
  })
})
