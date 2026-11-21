import importWorkerScript from 'workers/importWorkerScript'

import { env } from './env'

const importWorkScriptCode = importWorkerScript.toString()
const basename = env.BASENAME

export default class WebWorker {
  constructor(workerFile, terminateOnResult = true, dependencies = []) {
    const code = workerFile.toString()
    const dependencyCode = dependencies.map((d) => `${d.toString()};`).join()
    const blob = new Blob([
      `
      const basename = ${basename || "''"};
      ${dependencyCode};
      const importWorkerScript = ${importWorkScriptCode};
      const code = ${code};
      code();
    `
    ])
    this.worker =
      typeof Worker !== 'undefined'
        ? new Worker(URL.createObjectURL(blob))
        : null
    this.terminateOnResult = terminateOnResult
  }

  call = (params, key = '') => {
    this.worker.postMessage(JSON.stringify({ ...params, key }))
  }

  getResult = async (key = '') => {
    return new Promise((resolve, reject) => {
      this.worker.addEventListener('message', (event) => {
        if (event.data.key) {
          if (event.data.key === key) {
            resolve(event.data.result)
          }
        } else {
          resolve(event.data)
        }
        if (this.terminateOnResult) {
          this.worker.terminate()
        }
      })
    })
  }
}
