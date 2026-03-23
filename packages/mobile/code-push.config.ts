/**
 * CodePush CLI config for publishing OTA updates.
 * Implement bundleUploader, getReleaseHistory, and setReleaseHistory to use
 * your storage (e.g. S3, GCS, or a custom API). See OTA_UPDATES.md.
 */

import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { fileURLToPath } from 'url'

import type {
  CliConfigInterface,
  ReleaseHistoryInterface
} from '@bravemobile/react-native-code-push'

// ESM (how ts-node / code-push load this file in CI): __dirname is undefined; use import.meta.url.
const packageDir = path.dirname(fileURLToPath(import.meta.url))
const OTA_OUTPUT_DIR = path.join(packageDir, 'build', 'codepush')
const DEFAULT_S3_PREFIX = 'mobile-ota'

const getRequiredEnv = (key: string) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required env var: ${key}`)
  }
  return value
}

const getBaseUrl = () => {
  return (
    process.env.OTA_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
    `https://download.audius.co/${DEFAULT_S3_PREFIX}`
  )
}

const getS3Path = (...parts: string[]) => {
  const bucket = getRequiredEnv('OTA_S3_BUCKET')
  const prefix = (process.env.OTA_S3_PREFIX ?? DEFAULT_S3_PREFIX).replace(/^\/|\/$/g, '')
  return `s3://${bucket}/${prefix}/${parts.join('/')}`
}

const uploadFileToS3 = (sourcePath: string, destinationPath: string, cacheControl: string) => {
  execFileSync(
    'aws',
    [
      's3',
      'cp',
      sourcePath,
      destinationPath,
      '--content-type',
      'application/json',
      '--cache-control',
      cacheControl
    ],
    { stdio: 'inherit' }
  )
}

const Config: CliConfigInterface = {
  async bundleUploader(
    source: string,
    platform: 'ios' | 'android',
    identifier: string | undefined
  ): Promise<{ downloadUrl: string }> {
    const id = identifier ?? 'production'
    const fileName = path.basename(source)
    const objectKey = `bundles/${platform}/${id}/${Date.now()}-${fileName}`
    const destinationPath = getS3Path(objectKey)

    execFileSync('aws', ['s3', 'cp', source, destinationPath, '--cache-control', 'public,max-age=31536000,immutable'], {
      stdio: 'inherit'
    })

    return {
      downloadUrl: `${getBaseUrl()}/${objectKey}`
    }
  },

  async getReleaseHistory(
    targetBinaryVersion: string,
    platform: 'ios' | 'android',
    identifier: string | undefined
  ): Promise<ReleaseHistoryInterface> {
    const id = identifier ?? 'production'
    const url = `${getBaseUrl()}/histories/${platform}/${id}/${targetBinaryVersion}.json`
    try {
      const res = await fetch(url)
      if (!res.ok) {
        return {}
      }
      const data = (await res.json()) as ReleaseHistoryInterface
      return data
    } catch {
      const filePath = path.join(
        OTA_OUTPUT_DIR,
        'histories',
        platform,
        id,
        `${targetBinaryVersion}.json`
      )
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ReleaseHistoryInterface
        return data
      }
      return {}
    }
  },

  async setReleaseHistory(
    targetBinaryVersion: string,
    jsonFilePath: string,
    releaseInfo: ReleaseHistoryInterface,
    platform: 'ios' | 'android',
    identifier: string | undefined
  ): Promise<void> {
    const id = identifier ?? 'production'
    const dir = path.join(OTA_OUTPUT_DIR, 'histories', platform, id)
    fs.mkdirSync(dir, { recursive: true })
    const outPath = path.join(dir, `${targetBinaryVersion}.json`)
    fs.writeFileSync(outPath, JSON.stringify(releaseInfo, null, 2))

    const tmpJsonPath = path.join(
      os.tmpdir(),
      `codepush-history-${platform}-${id}-${targetBinaryVersion}.json`
    )
    fs.writeFileSync(tmpJsonPath, JSON.stringify(releaseInfo, null, 2))
    const destinationPath = getS3Path(
      'histories',
      platform,
      id,
      `${targetBinaryVersion}.json`
    )
    uploadFileToS3(tmpJsonPath, destinationPath, 'no-store, no-cache, must-revalidate')
  }
}

// CommonJS `require()` (used by the code-push CLI) only attaches named exports to `module.exports`.
// A default export ends up as `.default`, so `config.setReleaseHistory` would be undefined without these.
export const bundleUploader = Config.bundleUploader
export const getReleaseHistory = Config.getReleaseHistory
export const setReleaseHistory = Config.setReleaseHistory

export default Config
