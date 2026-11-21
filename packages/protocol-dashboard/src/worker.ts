import {
  getAssetFromKV,
  serveSinglePageApp
} from '@cloudflare/kv-asset-handler'
// eslint-disable-next-line import/no-unresolved
import manifestJSON from '__STATIC_CONTENT_MANIFEST'

const assetManifest = JSON.parse(manifestJSON)

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil(promise: Promise<any>) {
            return ctx.waitUntil(promise)
          }
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          mapRequestToAsset: serveSinglePageApp
        }
      )
    } catch (e: any) {
      return new Response(e?.message || 'Error', { status: e?.status || 500 })
    }
  }
}
