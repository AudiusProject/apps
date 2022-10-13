import type Logger from 'bunyan'

import axios from 'axios'
import _ from 'lodash'

const asyncRetry = require('../../utils/asyncRetry')

const EXPORT_REQ_TIMEOUT_MS = 60 /* sec */ * 1000 /* millis */
const EXPORT_REQ_MAX_RETRIES = 3

type ExportQueryParams = {
  wallet_public_key: string
  clock_range_min: number
  force_export: boolean
  source_endpoint?: string
}
type FetchExportParams = {
  nodeEndpointToFetchFrom: string
  wallet: string
  clockRangeMin: number
  selfEndpoint?: string
  logger: Logger
  forceExport?: boolean
}
type FetchExportOutput = {
  fetchedCNodeUser?: any
  error?: {
    message: string
    code: 'failure_export_wallet'
  }
  abort?: {
    message: string
    code:
      | 'abort_user_does_not_exist_on_node'
      | 'abort_multiple_users_returned_from_export'
      | 'abort_missing_user_export_key_fields'
      | 'abort_mismatched_export_wallet'
  }
}

async function fetchExportFromNode({
  nodeEndpointToFetchFrom,
  wallet,
  clockRangeMin,
  selfEndpoint,
  logger,
  forceExport = false
}: FetchExportParams): Promise<FetchExportOutput> {
  const exportQueryParams: ExportQueryParams = {
    wallet_public_key: wallet,
    clock_range_min: clockRangeMin,
    force_export: forceExport
  }

  // This is used only for logging by primary to record endpoint of requesting node
  if (selfEndpoint) {
    exportQueryParams.source_endpoint = selfEndpoint
  }

  // Make request to get data from /export route
  let exportResp
  try {
    exportResp = await asyncRetry({
      // Throws on any non-200 response code
      asyncFn: () =>
        axios({
          method: 'get',
          baseURL: nodeEndpointToFetchFrom,
          url: '/export',
          responseType: 'json',
          params: exportQueryParams,
          timeout: EXPORT_REQ_TIMEOUT_MS
        }),
      retries: EXPORT_REQ_MAX_RETRIES,
      log: false
    })
  } catch (e: any) {
    logger.error(`Error fetching /export route: ${e.message}`)
    return {
      error: {
        message: e.message,
        code: 'failure_export_wallet'
      }
    }
  }

  // Validate export response has cnodeUsers array with 1 wallet
  const { data: body } = exportResp
  if (!_.has(body, 'data.cnodeUsers') || _.isEmpty(body.data.cnodeUsers)) {
    return {
      abort: {
        message: '"cnodeUsers" array is empty or missing from response body',
        code: 'abort_user_does_not_exist_on_node'
      }
    }
  }
  const { cnodeUsers } = body.data
  if (Object.keys(cnodeUsers).length > 1) {
    return {
      abort: {
        message: 'Multiple cnodeUsers returned from export',
        code: 'abort_multiple_users_returned_from_export'
      }
    }
  }

  // Ensure all required properties are present
  const fetchedCNodeUser: any = Object.values(cnodeUsers)[0]
  if (
    !_.has(fetchedCNodeUser, 'walletPublicKey') ||
    !_.has(fetchedCNodeUser, 'clock') ||
    !_.has(fetchedCNodeUser, ['clockInfo', 'localClockMax']) ||
    !_.has(fetchedCNodeUser, ['clockInfo', 'requestedClockRangeMax'])
  ) {
    return {
      abort: {
        message:
          'Required properties not found on CNodeUser in response object',
        code: 'abort_missing_user_export_key_fields'
      }
    }
  }

  // Validate wallet from cnodeUsers array matches the wallet we requested in the /export request
  if (wallet !== fetchedCNodeUser.walletPublicKey) {
    return {
      abort: {
        message: `Returned data for walletPublicKey that was not requested: ${fetchedCNodeUser.walletPublicKey}`,
        code: 'abort_mismatched_export_wallet'
      }
    }
  }

  logger.info('Export successful')

  return {
    fetchedCNodeUser
  }
}

export { fetchExportFromNode }
export type { FetchExportParams, FetchExportOutput }
