import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Command } from 'commander'

const execAsync = promisify(exec)

const program = new Command()

const OUT_DIR = 'src/sdk/api/generator/out'

const SWAGGER_SPEC_PATH = path.join(OUT_DIR, 'swagger.yaml')

const TEMPLATES_DIR = 'src/sdk/api/generator/templates'
const GENERATED_DIR = 'src/sdk/api/generated'

const spawnOpenAPIGenerator = async (openApiGeneratorArgs) => {
  console.info('Running OpenAPI Generator:')
  const fullCmd = `docker run --user $(id -u):$(id -g) --rm -v "${
    process.env.PWD
  }:/local" openapitools/openapi-generator-cli:v7.5.0 ${openApiGeneratorArgs.join(
    ' '
  )}`
  console.info(fullCmd)
  const { stderr, stdout } = await execAsync(fullCmd)
  if (stdout) {
    console.info('stdout:', stdout)
  }
  if (stderr) {
    console.warn('stderr:', stderr)
  }
}

const clearOutput = ({ apiFlavor }) => {
  fs.rmSync(path.join(process.env.PWD, OUT_DIR), {
    recursive: true,
    force: true
  })
  fs.rmSync(path.join(process.env.PWD, GENERATED_DIR, apiFlavor), {
    recursive: true,
    force: true
  })
  fs.mkdirSync(path.join(process.env.PWD, OUT_DIR))
}

const downloadSpec = async ({ env, apiVersion, apiFlavor }) => {
  // Setup args
  let baseURL = ''
  if (env === 'dev') {
    baseURL = 'http://127.0.0.1:1323'
  } else if (env === 'prod') {
    baseURL = 'https://api.audius.co'
  }
  const apiPath = apiFlavor === '' ? apiVersion : `${apiVersion}/${apiFlavor}`

  const res = await fetch(`${baseURL}/${apiPath}/swagger.yaml`)
  const spec = await res.text()
  fs.writeFileSync(path.join(process.env.PWD, SWAGGER_SPEC_PATH), spec)
}

const copySpecFromLocal = (specPath) => {
  const absolutePath = path.isAbsolute(specPath)
    ? specPath
    : path.join(process.env.PWD, specPath)
  fs.copyFileSync(absolutePath, path.join(process.env.PWD, SWAGGER_SPEC_PATH))
}

const generate = async ({ apiFlavor, generator }) => {
  const outputFolderName = apiFlavor === '' ? 'default' : apiFlavor
  const openApiGeneratorArgs = [
    'generate',
    '-g',
    generator,
    '-i',
    `/local/${SWAGGER_SPEC_PATH}`,
    '-o',
    `/local/${GENERATED_DIR}/${outputFolderName}`,
    '--additional-properties=modelPropertyNaming=camelCase,useSingleRequestParameter=true,withSeparateModelsAndApi=true,apiPackage=api,modelPackage=model',
    '-t',
    `/local/${TEMPLATES_DIR}/${generator}`
  ]
  await spawnOpenAPIGenerator(openApiGeneratorArgs)
}

program
  .command('generate', { isDefault: true })
  .description('Generates the v1 default API client (v1/full has been removed)')
  .option('--env <env>', 'The environment of the DN to gen from', 'prod')
  .option('--api-version <apiVersion>', 'The API version', 'v1')
  .option(
    '--spec <path>',
    'Use a local swagger YAML file instead of fetching (path relative to cwd or absolute)'
  )
  .option('--generator <generator>', 'The generator to use', 'typescript-fetch')
  .action(async (options) => {
    // Only generate default (v1) client; v1/full is no longer used
    const apiFlavor = ''
    const opts = { ...options, apiFlavor }
    clearOutput(opts)
    if (options.spec) {
      copySpecFromLocal(options.spec)
    } else {
      await downloadSpec(opts)
    }
    await generate(opts)
  })

program
  .command('template')
  .description('Download templates for the given generator')
  .argument(
    '[generator]',
    'The generator to download templates for',
    'typescript-fetch'
  )
  .action((generator) => {
    spawnOpenAPIGenerator([
      'author',
      'template',
      '-g',
      generator,
      '-o',
      `/local/${TEMPLATES_DIR}/${generator}`
    ])
  })

async function main() {
  await program.parseAsync()
}
main()
