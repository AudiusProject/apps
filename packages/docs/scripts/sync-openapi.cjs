#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const LOCAL_SOURCE = 'http://localhost:1323/v1/swagger.yaml'
const PROD_SOURCE = 'https://api.audius.co/v1/swagger.yaml'
const TARGET = path.join(__dirname, '../docs/public/openapi.yaml')

const SERVERS_BLOCK = `servers:
  - url: https://api.audius.co/v1
    description: Production`

function replaceServers(yaml) {
  // Remove any existing servers block
  const stripped = yaml.replace(/^servers:[\s\S]*?(?=^\S)/m, '')
  // Insert servers block immediately after the info: block
  return stripped.replace(/^(info:[\s\S]*?)(?=^\S)/m, `$1${SERVERS_BLOCK}\n`)
}

;(async () => {
  const useLocal = process.argv.includes('--local')
  const source = useLocal ? LOCAL_SOURCE : PROD_SOURCE

  console.log(`Fetching from ${source}...`)
  const res = await fetch(source)
  if (!res.ok) {
    console.error(`Failed to fetch OpenAPI spec: status ${res.status}`)
    process.exitCode = 1
    return
  }
  const raw = await res.text()

  const patched = replaceServers(raw)
  fs.mkdirSync(path.dirname(TARGET), { recursive: true })
  fs.writeFileSync(TARGET, patched, 'utf8')
  console.log(`Synced spec from ${source} to ${TARGET}`)
})()
