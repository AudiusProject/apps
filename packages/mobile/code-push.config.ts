/**
 * CodePush CLI config for publishing OTA updates.
 * Implement bundleUploader, getReleaseHistory, and setReleaseHistory to use
 * your storage (e.g. S3, GCS, or a custom API). See OTA_UPDATES.md.
 */

import type {
  CliConfigInterface,
  ReleaseHistoryInterface
} from '@bravemobile/react-native-code-push'
import * as fs from 'fs'
import * as path from 'path'

const OTA_OUTPUT_DIR = path.join(__dirname, 'build', 'codepush')

const Config: CliConfigInterface = {
  async bundleUploader(
    source: string,
    platform: 'ios' | 'android',
    identifier: string | undefined
  ): Promise<{ downloadUrl: string }> {
    // TODO: Upload the bundle at `source` to your CDN/storage and return the public URL.
    // Example (S3): await s3.upload(source) -> return { downloadUrl: 'https://...' }
    void source
    void platform
    void identifier
    throw new Error(
      'Implement bundleUploader in code-push.config.ts: upload the bundle and return { downloadUrl }'
    )
  },

  async getReleaseHistory(
    targetBinaryVersion: string,
    platform: 'ios' | 'android',
    identifier: string | undefined
  ): Promise<ReleaseHistoryInterface> {
    const id = identifier ?? 'production'
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
  }
}

export default Config
