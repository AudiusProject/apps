type QueuePlayer<T> = {
  add: (tracks: T[], insertBeforeIndex?: number) => Promise<unknown>
  remove: (indexes: number[]) => Promise<unknown>
}

/**
 * Adds the tracks before and after the current track, which must already be
 * the only item in the queue, so the final order is [...before, current,
 * ...after].
 *
 * On iOS, SwiftAudioEx only shifts its current index for an insert in front
 * of the current track when the queue already holds more than one item.
 * Inserting in front of a lone track leaves the index pointing one slot too
 * early, so when the track ends the player replays it instead of advancing.
 * To avoid that, the "after" tracks go in first, and when there are none a
 * placeholder is appended for the duration of the insert.
 */
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
    // Queue is now [...before, current, placeholder]
    await player.remove([before.length + 1])
  }
}
