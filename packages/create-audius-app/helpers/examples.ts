import fs from 'fs'
import { copy } from '../helpers/copy'

import path from 'path'

export type ExampleType = 'react' | 'react-hono'

export interface GetExampleFileArgs {
  example: ExampleType
  file: string
}

export interface InstallExampleArgs {
  example: ExampleType
  appName: string
  root: string
}

export const exampleExists = (example: string) => {
  const examplePath = path.join(__dirname, '../examples', example)
  return fs.existsSync(examplePath)
}

export const getExampleFile = ({
  example,
  file
}: GetExampleFileArgs): string => {
  return path.join(__dirname, '../examples', example, file)
}

export const installExample = async ({ root, example }: InstallExampleArgs) => {
  const copySource = ['**']
  const examplePath = path.join(__dirname, '../examples', example)

  await copy(copySource, root, {
    parents: true,
    cwd: examplePath
  })
}
