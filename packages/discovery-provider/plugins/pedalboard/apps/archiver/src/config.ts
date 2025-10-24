import 'dotenv/config'
import { cleanEnv, str, num } from 'envalid'
import { LogLevel } from './logger'

export type Environment = 'dev' | 'stage' | 'prod'

export type Config = {
  environment: Environment
  /** How often the job to cleanup orphaned files should run (default: 10 seconds) */
  cleanupOrphanedFilesIntervalSeconds: number
  /** How long to keep completed jobs that have not been downloaded (default: 10 minutes) */
  orphanedJobsLifetimeSeconds: number
  /** How many concurrent archive jobs to run (default: 5) */
  concurrentJobs: number
  /** How many attempts to make to create a stems archive (default: 3) */
  maxStemsArchiveAttempts: number
  redisUrl: string
  serverHost: string
  serverPort: number
  /** Temporary directory for storing stems archive files (default: '/tmp/audius-archiver') */
  archiverTmpDir: string
  /** Maximum disk space to use for processing archives. NOTE: This limit will not affect temporary space used to zip files, so the actual used space may exceed it temporarily until the source files for the zip are deleted. (default: 32GB) */
  maxDiskSpaceBytes: number
  /** Maximum time to wait for disk space to be available (default: 60 seconds) */
  maxDiskSpaceWaitSeconds: number
  /** Log level to use for the archiver (default: 'info') */
  logLevel: LogLevel
}

let config: Config | null = null

export const readConfig = (): Config => {
  if (config !== null) return config

  const env = cleanEnv(process.env, {
    audius_discprov_env: str<Environment>({
      default: 'dev'
    }),
    audius_redis_url: str({
      default: 'redis://audius-discovery-provider-redis-1:6379/0'
    }),
    archiver_server_host: str({ default: '0.0.0.0' }),
    archiver_server_port: num({ default: 6004 }),
    archiver_concurrent_jobs: num({ default: 5 }),
    archiver_tmp_dir: str({ default: '/tmp/audius-archiver' }),
    archiver_cleanup_orphaned_files_interval_seconds: num({
      default: 10
    }),
    archiver_orphaned_jobs_lifetime_seconds: num({ default: 60 * 10 }),
    archiver_log_level: str<LogLevel>({ default: 'info' }),
    archiver_max_stems_archive_attempts: num({ default: 3 }),
    archiver_max_disk_space_bytes: num({ default: 32 * 1024 * 1024 * 1024 }), // 32GB
    archiver_max_disk_space_wait_seconds: num({ default: 60 })
  })

  config = {
    environment: env.audius_discprov_env,
    concurrentJobs: env.archiver_concurrent_jobs,
    redisUrl: env.audius_redis_url,
    serverHost: env.archiver_server_host,
    serverPort: env.archiver_server_port,
    archiverTmpDir: env.archiver_tmp_dir,
    cleanupOrphanedFilesIntervalSeconds:
      env.archiver_cleanup_orphaned_files_interval_seconds,
    orphanedJobsLifetimeSeconds: env.archiver_orphaned_jobs_lifetime_seconds,
    maxStemsArchiveAttempts: env.archiver_max_stems_archive_attempts,
    maxDiskSpaceBytes: env.archiver_max_disk_space_bytes,
    maxDiskSpaceWaitSeconds: env.archiver_max_disk_space_wait_seconds,
    logLevel: env.archiver_log_level
  }
  return config
}
