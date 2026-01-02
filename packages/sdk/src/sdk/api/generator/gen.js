const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const util = require('util')

const execAsync = util.promisify(exec)

const commander = require('commander')

const program = new commander.Command()

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
  .description('Generates the client')
  .option('--env <env>', 'The environment of the DN to gen from', 'prod')
  .option('--api-version <apiVersion>', 'The API version', 'v1')
  .option('--api-flavor <apiFlavor>', 'The API flavor', '')
  .option('--generator <generator>', 'The generator to use', 'typescript-fetch')
  .action(async (options) => {
    clearOutput(options)
    await downloadSpec(options)
    await generate(options)
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
