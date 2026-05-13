import { initializeDiscoveryDb } from '@pedalboard/basekit'

import { config } from './config'

/**
 * Single shared Knex connection pool for the solana-relay service.
 *
 * Previously each route module called initializeDiscoveryDb() independently,
 * creating up to 9 separate pools (each with a default max of 10 connections)
 * and exhausting the Postgres connection limit under load.
 */
export const db = initializeDiscoveryDb(config.discoveryDbConnectionString)
