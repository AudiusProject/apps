import { Pool as PG, types } from 'pg'
import { Client as ES } from '@elastic/elasticsearch'
import Cursor from 'pg-cursor'
import _ from 'lodash'
import { indexNames } from './indexNames'
import { BlocknumberCheckpoint } from './types/blocknumber_checkpoint'
import { logger } from './logger'

types.setTypeParser(20, (value) => parseFloat(value))

let pool: PG | undefined = undefined
export function dialPg(): PG {
  if (!pool) {
    let connectionString = process.env.audius_db_url
    pool = new PG({ connectionString, application_name: 'es-indexer', types })
  }

  return pool
}

export async function queryCursor(sql: string) {
  const client = await dialPg().connect()
  const cursor = client.query(new Cursor(sql))
  return { client, cursor }
}

let esc: ES | undefined = undefined
export function dialEs() {
  if (!esc) {
    let url = process.env.audius_elasticsearch_url
    esc = new ES({ node: url })
  }
  return esc
}

export async function recoverFromRedIndex() {
  const es = dialEs()

  let redIndices = []

  for (let i = 0; i < 10; i++) {
    const indices = await es.cat.indices({ format: 'json' })
    redIndices = indices.filter((i) => i.health == 'red')
    if (redIndices.length == 0) {
      return
    }
    await new Promise((r) => setTimeout(r, 5000))
  }

  try {
    await Promise.all(
      redIndices.map((idx) => {
        logger.warn('nuking red index ' + idx.index)
        return es.indices.delete({ index: idx.index }, { ignore: [404] })
      })
    )
    logger.info('nuke worked')
  } catch (e) {
    logger.error(e, 'nuke failed')
  }
}

export async function waitForHealthyCluster() {
  return dialEs().cluster.health(
    {
      wait_for_status: 'green',
      timeout: '60s',
    },
    {
      requestTimeout: '60s',
    }
  )
}

export async function ensureSaneCluterSettings() {
  return dialEs().cluster.putSettings({
    persistent: {
      'action.auto_create_index': false,
    },
  })
}

export async function getBlocknumberCheckpoints(): Promise<BlocknumberCheckpoint> {
  const searches = []

  for (let [tableName, indexName] of Object.entries(indexNames)) {
    searches.push({ index: indexName })
    searches.push({
      size: 0,
      aggs: {
        max_blocknumber: {
          max: {
            field: checkpointField(tableName),
          },
        },
      },
    })
  }

  const multi = await dialEs().msearch({ searches })
  const values = multi.responses.map(
    (r: any) => r.aggregations?.max_blocknumber?.value || 0
  )

  const tableNames = Object.keys(indexNames)
  const checkpoints = _.zipObject(tableNames, values) as BlocknumberCheckpoint
  return checkpoints
}

function checkpointField(tableName: string) {
  switch (tableName) {
    case 'plays':
      return 'created_at'
    default:
      return 'blocknumber'
  }
}
