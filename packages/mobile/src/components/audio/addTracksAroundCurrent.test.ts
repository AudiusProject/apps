import { addTracksAroundCurrent } from './addTracksAroundCurrent'

// Mirrors SwiftAudioEx 1.x QueueManager: an insert in front of the current
// item only shifts currentIndex when the queue already has more than one item.
const makeSwiftAudioExQueue = (current: string) => {
  const queue = { items: [current], currentIndex: 0 }
  const player = {
    add: async (tracks: string[], index?: number) => {
      const at = index ?? queue.items.length
      if (queue.items.length > 1 && queue.currentIndex >= at) {
        queue.currentIndex += tracks.length
      }
      queue.items.splice(at, 0, ...tracks)
    },
    remove: async (indexes: number[]) => {
      for (const index of [...indexes].sort((a, b) => b - a)) {
        queue.items.splice(index, 1)
        if (index < queue.currentIndex) queue.currentIndex -= 1
      }
    }
  }
  return { queue, player }
}

const cases: Array<[string, string[], string[]]> = [
  ['first track', [], ['b', 'c']],
  ['middle track', ['a'], ['c']],
  ['middle track with several before', ['a', 'b', 'c'], ['e', 'f']],
  ['last track', ['a', 'b'], []],
  ['last of two', ['a'], []],
  ['only track', [], []]
]

describe('addTracksAroundCurrent', () => {
  it.each(cases)(
    'keeps order and current index for the %s',
    async (_, before, after) => {
      const { queue, player } = makeSwiftAudioExQueue('current')
      await addTracksAroundCurrent(player, before, after)

      expect(queue.items).toEqual([...before, 'current', ...after])
      expect(queue.items[queue.currentIndex]).toBe('current')
    }
  )
})
