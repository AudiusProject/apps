type QueuePlayer<T> = {
  add: (tracks: T[], insertBeforeIndex?: number) => Promise<unknown>
  remove: (indexes: number[]) => Promise<unknown>
}

export const addTracksAroundCurrent = async <T>(
  player: QueuePlayer<T>,
  before: T[],
  after: T[]
) => {
  if (after.length > 0) {
    await player.add(after)
  }
  if (before.length === 0) return

  const needsPlaceholder = after.length === 0
  if (needsPlaceholder) {
    await player.add([before[before.length - 1]])
  }

  await player.add(before, 0)

  if (needsPlaceholder) {
    await player.remove([before.length + 1])
  }
}
