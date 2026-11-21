import execa from 'execa'
import fs from 'fs-extra'
import path from 'path'
import { useTempDir } from './use-temp-dir'
import { describe, it, expect } from 'vitest'
import { projectFilesShouldExist, projectFilesShouldNotExist } from './utils'

const cli = require.resolve('create-audius-app/dist/index.js')

const run = (args: string[], options: execa.Options) => {
  return execa('node', [cli].concat(args), {
    ...options,
    env: {
      ...(options.env || {})
    } as any
  })
}

describe('create audius app', () => {
  it('non-empty directory', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'non-empty-directory'
      await fs.mkdirp(path.join(cwd, projectName))
      const pkg = path.join(cwd, projectName, 'package.json')
      fs.writeFileSync(pkg, '{ "foo": "bar" }')

      const res = await run([projectName], {
        cwd,
        reject: false
      })
      expect(res.exitCode).toBe(1)
      expect(res.stdout).toMatch(/contains files that could conflict/)
    })
  })

  it('empty directory', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'empty-directory'
      const res = await run([projectName], { cwd })

      expect(res.exitCode).toBe(0)
      projectFilesShouldExist({
        cwd,
        projectName,
        files: ['package.json', 'src/client/App.tsx', '.gitignore']
      })
    })
  })

  it('invalid example name', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'invalid-example-name'
      const res = await run([projectName, '--example', 'not a real example'], {
        cwd,
        reject: false
      })

      expect(res.exitCode).toBe(1)
      projectFilesShouldNotExist({
        cwd,
        projectName,
        files: ['package.json']
      })
    })
  })

  it('valid example', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'valid-example'
      const res = await run([projectName, '--example', 'react'], {
        cwd
      })

      expect(res.exitCode).toBe(0)
      projectFilesShouldExist({
        cwd,
        projectName,
        files: ['package.json', 'src/App.tsx', '.gitignore']
      })
    })
  })

  it('should fall back to default template', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'fail-example'
      const res = await run([projectName], {
        cwd,
        input: '\n'
      })

      expect(res.exitCode).toBe(0)
      projectFilesShouldExist({
        cwd,
        projectName,
        files: ['package.json', 'src/client/App.tsx', '.gitignore']
      })
    })
  })

  it('should exit if the folder is not writable', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'not-writable'

      if (
        await fs
          .writeFile(path.join(cwd, 'test'), 'hello')
          .then(() => true)
          .catch(() => false)
      ) {
        console.warn(
          `Test folder is not write restricted skipping write permission test`
        )
        return
      }
      const res = await run([projectName], {
        cwd,
        reject: false
      })

      expect(res.stderr).toMatch(
        /you do not have write permissions for this folder/
      )
      expect(res.exitCode).toBe(1)
    }, 0o500)
  })

  it('should create a project in the current directory', async () => {
    await useTempDir(async (cwd) => {
      const env = { ...process.env }

      const res = await run(['.'], {
        cwd,
        env,
        extendEnv: false,
        stdio: 'inherit'
      })

      expect(res.exitCode).toBe(0)
      projectFilesShouldExist({
        cwd,
        files: ['package.json', 'src/client/App.tsx', '.gitignore']
      })
    })
  })

  it('should ask the user for a name for the project if none supplied', async () => {
    await useTempDir(async (cwd) => {
      const projectName = 'my-app'
      const res = await run([], {
        cwd,
        input: `${projectName}\n`
      })

      expect(res.exitCode).toBe(0)
      projectFilesShouldExist({
        cwd,
        projectName: 'my-app',
        files: ['package.json', 'src/client/App.tsx', '.gitignore']
      })
    })
  })
})
