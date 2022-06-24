
import type { Gauge } from 'prom-client'
import { gateway } from './prometheus';

import Web3 from 'web3';
const web3 = new Web3()
const dotenv = require('dotenv')


import type { AxiosResponse } from 'axios';
import axios from 'axios';
import * as http from 'http';
import * as https from 'https';
import retry from 'async-retry';

// const UnhealthyTimeRangeMs = 1_800_000 // 30min
const UnhealthyTimeRangeMs = 300_000 // 5min
const unhealthyNodes: Record<string, number> = {}

axios.defaults.timeout = 300_000 // 5min
axios.defaults.httpAgent = new http.Agent({ timeout: 60000 })
axios.defaults.httpsAgent = new https.Agent({ timeout: 60000, rejectUnauthorized: false })

let envInitialized = false

export const makeRequest = async (
    request: {
        baseURL: string,
        url: string
    },
    retries: number,
    log: boolean,
    deregisteredCN: string[],
    additionalInfo: object,
): Promise<{
    response?: AxiosResponse<any, any>,
    attemptCount: number,
    canceled: boolean,
}> => {
    const additionalInfoMsg = (additionalInfo) ? ` ${JSON.stringify(additionalInfo)}` : ''

    const endpoint = request.baseURL
    const fullURL = `${endpoint}${request.url}`

    // Exit early to avoid wasting time on a deregistered node
    if (deregisteredCN.includes(endpoint)) {
        console.log(`[makeRequest] Skipping request to ${endpoint} since it has been deregistered`)

        return { attemptCount: 0, canceled: true }
    }

    // Exit early to avoid wasting time on a node recently marked unhealthy
    if (nodeRecentlyMarkedUnhealthy(endpoint)) {
        console.log(`[makeRequest] Skipping request to ${endpoint} since it was recently confirmed unhealthy`)
        return { attemptCount: 0, canceled: true }
    }

    const startMs = Date.now()
    let attemptCount = 1
    try {
        const response = await retry(
            async () => axios(request),
            {
                retries,
                factor: 4,
                minTimeout: 30_000,
                onRetry: (e: Error) => {
                    attemptCount++
                    console.debug(`\t[makeRequest Retrying] (${fullURL}) - ${attemptCount} attempts - Error ${e.message} - ${logDuration(Date.now() - startMs)}${additionalInfoMsg}`)
                }
            }
        )
        if (log) console.debug(`\t[makeRequest Success] (${fullURL}) - ${attemptCount} attempts - ${logDuration(Date.now() - startMs)}${additionalInfoMsg}`)
        return { response, attemptCount, canceled: false }
    } catch (e) {
        // mark node as unhealthy to speed up future processing
        console.log(`\t[makeRequest] Adding ${endpoint} to unhealthyNodes at ${Date.now()}`)
        unhealthyNodes[endpoint] = Date.now()

        const errorMsg = `[makeRequest Error] (${fullURL}) - ${attemptCount} attempts - ${logDuration(Date.now() - startMs)}${additionalInfoMsg} - ${(e as Error).message}`
        console.log(`\t${errorMsg}`)
        throw new Error(`${errorMsg}`)
    }
}

export const generateSPSignatureParams = (signatureSpID: number, signatureSPDelegatePrivateKey: string) => {
    const { timestamp, signature } = generateTimestampAndSignature(
        { spID: signatureSpID },
        signatureSPDelegatePrivateKey
    )

    return {
        spID: signatureSpID,
        timestamp: timestamp,
        signature: signature
    }
}

/**
 * Generate the timestamp and signature for api signing
 * @param {object} data
 * @param {string} privateKey
 */
export const generateTimestampAndSignature = (data: object, privateKey: string) => {
    const timestamp = new Date().toISOString()
    const toSignObj = { ...data, timestamp }
    // JSON stringify automatically removes white space given 1 param
    const toSignStr = JSON.stringify(sortObj(toSignObj))
    const toSignHash = web3.utils.keccak256(toSignStr)
    const signedResponse = web3.eth.accounts.sign(toSignHash, privateKey)

    return { timestamp, signature: signedResponse.signature }
}

/**
 * used to track unhealthy nodes and avoid frequent repeated requests to speed up processing
 */

export const nodeRecentlyMarkedUnhealthy = (endpoint: string) => {
    if (!(endpoint in unhealthyNodes)) {
        return false
    }

    return ((Date.now() - unhealthyNodes[endpoint]!) <= UnhealthyTimeRangeMs)
}


// Appends suffixes to log msg based on duration, for easy log parsing
export const logDuration = (duration: number) => {
    let msg = `${duration}ms`
    if (duration > 10000) msg += ' Took 10+s'
    if (duration > 30000) msg += ' Took 30+s'
    if (duration > 50000) msg += ' Took 50+s'
    if (duration > 100000) msg += ' Took 100+s'
    return msg
}

// Sort object by its keys
export const sortObj = (obj: Record<any, any>) => {
    return Object.keys(obj).sort().reduce((result: Record<any, any>, key: string) => {
        result[key] = obj[key];
        return result;
    }, {});
}

export const retryAsyncFunctionOrError = async <T>(maxTries: number, func: () => T): Promise<T> => {
    for (let i = 0; i < maxTries; i++) {
        try {
            const returnValue = await func()
            return returnValue
        } catch (e) {
            console.log(`[retryAsyncFunctionOrError:${func.toString()}] the function failed (${(e as Error).message}), lets try again`)
            continue
        }
    }

    throw new Error(`[${func}] it didnt work :(`)
}

export const asyncSleep = (milliseconds: number) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export const getEnv = () => {

    if (!envInitialized) {
        const nodeEnv = process.env['NODE_ENV']

        if (nodeEnv === "production") {
            console.log('[+] running in production (.env.prod)')
            dotenv.config({ path: '.env.prod' })
        } else if (nodeEnv === "staging") {
            console.log('[+] running in staging (.env.stage)')
            dotenv.config({ path: '.env.stage' })
        } else {
            console.log('[+] running locally (.env.local)')
            dotenv.config({ path: '.env.local' })

        }

        envInitialized = true
    }


    const deregisteredContentNodesEnv: string = process.env['DEREGISTERED_CONTENT_NODES'] || ''
    const signatureSpID = parseInt(process.env['SIGNATURE_SPID'] || '0')
    const signatureSPDelegatePrivateKey = process.env['SIGNATURE_SP_DELEGATE_PRIV_KEY'] || ''

    const deregisteredCN: string[] = deregisteredContentNodesEnv.split(',')

    if (!signatureSpID || !signatureSPDelegatePrivateKey) {
        throw new Error('Missing required signature configs')
    }

    const db = {
        name: process.env['DB_NAME'] || '',
        host: process.env['DB_HOST'] || '',
        port: parseInt(process.env['DB_PORT'] || ''),
        username: process.env['DB_USERNAME'] || '',
        password: process.env['DB_PASSWORD'] || '',
        sql_logger: (process.env['SQL_LOGGING'] || '') in ['T', 't', 'True', 'true', '1']
    }

    const fdb = {
        name: process.env['FDB_NAME'] || '',
        host: process.env['FDB_HOST'] || '',
        port: process.env['FDB_PORT'] || '',
        username: process.env['FDB_USERNAME'] || '',
        password: process.env['FDB_PASSWORD'] || '',
    }

    return { db, fdb, deregisteredCN, signatureSpID, signatureSPDelegatePrivateKey }
}

export const exportDuration = async (tDelta: number, run_id: number, exporter: Gauge) => {

    exporter.set({ run_id }, tDelta)

    try {
        console.log(`[${run_id}] pushing duration to gateway`);
        await gateway.pushAdd({ jobName: 'network-monitoring' })
    } catch (e) {
        console.log(`[exportDuration] error pushing metrics to pushgateway - ${(e as Error).message}`)
    }
}