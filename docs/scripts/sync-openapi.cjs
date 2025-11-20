#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const SOURCE = 'https://api.audius.co/v1/swagger.yaml';
const TARGET = path.join(__dirname, '../docs/developers/openapi.yaml');

const SERVER_RE = /-\s*url:\s*['" ]?\/v1['" ]?/g;

function fetch(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Request failed with status ${res.statusCode}`));
          return;
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

(async () => {
  try {
    console.log(`Fetching ${SOURCE}...`);
    const raw = await fetch(SOURCE);
    const patched = raw
      .replace(/https:\/\/discoveryprovider\.audius\.co/g, 'https://api.audius.co')
      .replace(SERVER_RE, '- url: https://api.audius.co/v1');
    fs.writeFileSync(TARGET, patched, 'utf8');
    console.log(`Synced spec to ${TARGET}`);
  } catch (err) {
    console.error('Failed to sync OpenAPI spec:', err.message);
    process.exitCode = 1;
  }
})();
