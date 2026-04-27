import { LineupState } from '~/models/Lineup'

import { CommonState } from '..'

type LineupEntry = {
  actions: any
  selector: (state: CommonState, handle?: string) => LineupState<any>
}

/**
 * Legacy lineup registry. All lineups have been migrated to tanquery +
 * playback slice, so this registry is intentionally empty. Kept as an
 * export only so that any lingering imports compile; remove once no
 * importers remain.
 */
export const lineupRegistry: Record<string, LineupEntry> = {}
