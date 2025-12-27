/* eslint-disable import/no-extraneous-dependencies */
import { yellow } from 'picocolors'
import spawn from 'cross-spawn'

/**
 * Spawn an npm installation
 *
 * @returns A Promise that resolves once the installation is finished.
 */
export async function install(
  /** Indicate whether there is an active Internet connection.*/
  isOnline: boolean
): Promise<void> {
  const args: string[] = ['install']
  if (!isOnline) {
    console.log(
      yellow('You appear to be offline.\nFalling back to the local cache.')
    )
    args.push('--offline')
  }
  /**
   * Return a Promise that resolves once the installation is finished.
   */
  return new Promise((resolve, reject) => {
    /**
     * Spawn the installation process.
     */
    const child = spawn('npm', args, {
      stdio: ['inherit', 'inherit', 'ignore'], // Suppress warn
      env: {
        ...process.env,
        ADBLOCK: '1',
        // we set NODE_ENV to development as pnpm skips dev
        // dependencies when production
        NODE_ENV: 'development',
        DISABLE_OPENCOLLECTIVE: '1'
      }
    })
    child.on('close', (code: number | null) => {
      if (code !== 0) {
        reject({ command: `${'npm'} ${args.join(' ')}` })
        return
      }
      resolve()
    })
  })
}
