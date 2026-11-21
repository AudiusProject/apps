import { RepostDoc, SaveDoc } from './types/docs'
import { PlaylistIndexer } from './indexers/PlaylistIndexer'
import { RepostIndexer } from './indexers/RepostIndexer'
import { SaveIndexer } from './indexers/SaveIndexer'
import { TrackIndexer } from './indexers/TrackIndexer'
import { UserIndexer } from './indexers/UserIndexer'
import { PendingUpdates, startListener, takePending } from './listener'
import { logger } from './logger'
import {
  ensureSaneCluterSettings,
  getBlocknumberCheckpoints,
  recoverFromRedIndex,
  waitForHealthyCluster,
} from './conn'
import { program } from 'commander'

export const indexer = {
  playlists: new PlaylistIndexer(),
  reposts: new RepostIndexer(),
  saves: new SaveIndexer(),
  tracks: new TrackIndexer(),
  users: new UserIndexer(),
}

async function processPending(pending: PendingUpdates) {
  return Promise.all([
    indexer.playlists.indexIds(Array.from(pending.playlistIds)),
    indexer.tracks.indexIds(Array.from(pending.trackIds)),
    indexer.users.indexIds(Array.from(pending.userIds)),

    indexer.reposts.indexRows(pending.reposts as RepostDoc[]),
    indexer.saves.indexRows(pending.saves as SaveDoc[]),
  ])
}

async function start() {
  const cliFlags = program
    .option('--no-listen', 'exit after catchup is complete')
    .option('--drop', 'drop and recreate indexes')
    .parse()
    .opts()

  logger.info(cliFlags, 'booting')
  await recoverFromRedIndex()
  const health = await waitForHealthyCluster()
  await ensureSaneCluterSettings()
  logger.info(`starting: health ${health.status}`)

  const indexers = Object.values(indexer)
  await Promise.all(
    indexers.map((ix) => ix.createIndex({ drop: cliFlags.drop }))
  )

  await startListener()

  const checkpoints = await getBlocknumberCheckpoints()
  logger.info(checkpoints, 'catchup from blocknumbers')
  await Promise.all(Object.values(indexer).map((i) => i.catchup(checkpoints)))

  logger.info(checkpoints, 'refreshing indexes')
  await Promise.all(Object.values(indexer).map((i) => i.refreshIndex()))

  logger.info('catchup done... cutting over aliases')
  await Promise.all(indexers.map((ix) => ix.cutoverAlias()))

  logger.info('alias cutover done... dropping any old indices')
  await Promise.all(indexers.map((ix) => ix.cleanupOldIndices()))

  if (!cliFlags.listen) {
    logger.info('--no-listen: exiting')
    process.exit(0)
  }

  logger.info('processing events')
  while (true) {
    const pending = takePending()
    if (pending) {
      await processPending(pending)
      logger.info('processed new updates')
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

async function main() {
  try {
    await start()
  } catch (e) {
    logger.fatal(e, 'save me pm2')
    process.exit(1)
  }
}

main()

process
  .on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'unhandledRejection')
  })
  .on('uncaughtException', (err) => {
    logger.fatal(err, 'uncaughtException')
    process.exit(1)
  })
