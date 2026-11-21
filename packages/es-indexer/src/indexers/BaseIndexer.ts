import { Client } from '@elastic/elasticsearch'
import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types'
import { chunk } from 'lodash'
import { dialPg, queryCursor, dialEs } from '../conn'
import { BlocknumberCheckpoint } from '../types/blocknumber_checkpoint'
import { performance } from 'perf_hooks'
import { logger } from '../logger'
import { Logger } from 'pino'
import { indexNames } from '../indexNames'

export abstract class BaseIndexer<RowType> {
  private tableName: string
  private idColumn: string
  private indexName: string
  private logger: Logger
  private rowCounter = 0
  protected batchSize = 1000
  protected mapping: IndicesCreateRequest

  private es: Client

  constructor(tableName: string, idColumn: string) {
    this.tableName = tableName
    this.idColumn = idColumn
    this.indexName = indexNames[tableName]
    this.logger = logger.child({
      index: this.indexName,
    })

    this.es = dialEs()
  }

  baseSelect() {
    return `select * from ${this.tableName} where 1=1 `
  }

  async createIndex({ drop }: { drop: boolean }) {
    const { es, mapping, logger, tableName } = this
    if (!mapping) throw new Error(`${tableName} mapping is undefined`)
    if (drop) {
      logger.info('dropping index: ' + mapping.index)
      await es.indices.delete({ index: mapping.index }, { ignore: [404] })
      await es.indices.create(mapping)
    } else {
      await es.indices.create(mapping, { ignore: [400] })
    }
  }

  async refreshIndex() {
    const { es, logger, indexName } = this
    logger.info('refreshing index: ' + indexName)
    await es.indices.refresh({ index: indexName })
  }

  async cutoverAlias() {
    const { es, logger, indexName, tableName } = this

    const existingAlias = await es.cat.aliases({
      name: tableName,
      format: 'json',
    })

    const mappedTo = existingAlias[0]?.index

    if (!mappedTo) {
      logger.info({
        action: 'adding index',
      })
      await es.indices.putAlias({
        index: this.indexName,
        name: this.tableName,
      })
    } else if (mappedTo !== indexName) {
      logger.info({
        action: 'cutting over index',
        alias: tableName,
        from: mappedTo,
        to: indexName,
      })
      await es.indices.updateAliases({
        actions: [
          {
            remove: {
              alias: tableName,
              index: mappedTo,
            },
          },
          {
            add: {
              alias: tableName,
              index: indexName,
            },
          },
        ],
      })
    } else {
      logger.info({
        actions: 'noop',
        alias: tableName,
        index: indexName,
      })
    }
  }

  async cleanupOldIndices() {
    const { es, logger, indexName, tableName } = this
    const indices = await es.cat.indices({ format: 'json' })
    const old = indices.filter(
      (i) => i.index.startsWith(tableName) && i.index != indexName
    )
    for (let { index } of old) {
      try {
        await es.indices.delete({ index: index })
        logger.info(`dropped old index: ${index}`)
      } catch (e) {
        logger.error(e, `failed to drop old index: ${index}`)
      }
    }
  }

  async indexIds(ids: Array<number>) {
    if (!ids.length) return
    let sql = this.baseSelect()
    sql += ` and ${this.tableName}.${this.idColumn} in (${ids.join(',')}) `
    const result = await dialPg().query(sql)
    await this.indexRows(result.rows)
  }

  async catchup(checkpoint?: BlocknumberCheckpoint) {
    let sql = this.baseSelect()
    if (checkpoint) {
      sql += this.checkpointSql(checkpoint)
    }
    sql += ` order by blocknumber asc `
    const { client, cursor } = await queryCursor(sql)
    const batchSize = this.batchSize
    while (true) {
      const rows = await cursor.read(batchSize)
      if (rows.length == 0) break
      await this.indexRows(rows)
    }
    await cursor.close()
    client.release()
  }

  abstract checkpointSql(checkpoint: BlocknumberCheckpoint): string

  async indexRows(rows: Array<RowType>) {
    if (!rows.length) return

    const { es, logger } = this
    const took: Record<string, number> = {}

    let before = performance.now()
    await this.withBatch(rows)
    took.withBatch = performance.now() - before

    rows.forEach((r) => this.withRow(r))

    const chunks = chunk(rows, this.batchSize)

    for (let chunk of chunks) {
      const body = this.buildIndexOps(chunk)
      let attempt = 1

      for (attempt = 1; attempt < 10; attempt++) {
        const got = await es.bulk({ body })
        if (got.errors) {
          logger.error(
            got.items[0],
            `bulk indexing error.  Attempt #${attempt}`
          )
          await new Promise((r) => setTimeout(r, 5000 * attempt))
        } else {
          break
        }
      }

      this.rowCounter += chunk.length
      logger.info({
        updates: chunk.length,
        attempts: attempt,
        withBatchMs: took.withBatch.toFixed(0),
        lifetime: this.rowCounter,
      })
    }
  }

  buildIndexOps(rows: RowType[]) {
    return rows.flatMap((row) => [
      { index: { _id: row[this.idColumn], _index: this.indexName } },
      row,
    ])
  }

  async withBatch(rows: Array<RowType>) {}

  withRow(row: RowType) {}
}
