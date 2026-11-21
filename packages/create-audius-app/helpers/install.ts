/* eslint-disable import/no-extraneous-dependencies */
import { yellow } from 'picocolors'
import spawn from 'cross-spawn'

export async function install(isOnline: boolean): Promise<void> {
  const args: string[] = ['install']
  if (!isOnline) {
    console.log(
      yellow('You appear to be offline.\nFalling back to the local cache.')
    )
    args.push('--offline')
  }
  return new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      stdio: ['inherit', 'inherit', 'ignore'], // Suppress warn
      env: {
        ...process.env,
        ADBLOCK: '1',
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
