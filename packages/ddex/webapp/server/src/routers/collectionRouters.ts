import { z } from 'zod'

import { router, publicProcedure } from '../trpc'
import { collections } from '../controllers/collectionController'
import mongoose from 'mongoose'
import { Sort } from 'mongodb'

const getCollectionInput = z.object({
  nextId: z.string().optional(),
  prevId: z.string().optional(),
  limit: z.string().default('10')
})

const createCollectionRouter = (collection: string) => {
  return router({
    listCollection: publicProcedure
      .input(getCollectionInput)
      .query(async ({ input }) => {
        const { nextId, prevId, limit } = input
        const numericLimit = Number(limit)

        if (!Number.isInteger(numericLimit)) {
          throw new Error('Invalid pagination parameters')
        }

        let query: Record<string, any> = {} // No pagination, fetch the first `limit` items
        let sort: Sort = { _id: -1 } // Descending
        let flipResults = false

        if (nextId) {
          query = { _id: { $lt: new mongoose.Types.ObjectId(nextId) } } // IDs less than nextId
        } else if (prevId) {
          query = { _id: { $gt: new mongoose.Types.ObjectId(prevId) } } // IDs greater than prevId
          sort = { _id: 1 } // Ascending
          flipResults = true
        }

        const items = await mongoose.connection.db
          .collection(collection)
          .find(query)
          .sort(sort)
          .limit(numericLimit + 1)
          .toArray()

        let hasMoreNext = false
        let hasMorePrev = false

        if (items.length > numericLimit) {
          if (prevId) {
            hasMorePrev = true
          } else {
            hasMoreNext = true
          }
          items.pop()
        }

        if (flipResults) {
          items.reverse() // Reverse items to desc order when prevId is used
        }

        const firstItemId = items.length > 0 ? items[0]._id : null
        const lastItemId = items.length > 0 ? items[items.length - 1]._id : null

        // Check for next ids
        if (lastItemId) {
          const countAfter = await mongoose.connection.db
            .collection(collection)
            .find({ _id: { $lt: lastItemId } })
            .count()
          hasMoreNext = countAfter > 0
        }
        // Check for prev ids
        if (firstItemId) {
          const countBefore = await mongoose.connection.db
            .collection(collection)
            .find({ _id: { $gt: firstItemId } })
            .count()
          hasMorePrev = countBefore > 0
        }

        return { items, hasMoreNext, hasMorePrev }
      })
  })
}

const collectionRouters = collections.reduce(
  (acc, collection) => {
    acc[collection] = createCollectionRouter(collection)
    return acc
  },
  {} as Record<string, ReturnType<typeof createCollectionRouter>>
)

export default collectionRouters
