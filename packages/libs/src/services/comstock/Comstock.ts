import axios, { AxiosError, AxiosRequestConfig } from 'axios'

export type ComstockConfig = {
  comstockEndpoint: string
}

export class Comstock {
  comstockEndpoint: string

  constructor(comstockEndpoint: string) {
    this.comstockEndpoint = comstockEndpoint
  }

  async getComstock(obj: { wallet: string }) {
    const result = await this._makeRequest({
      url: '/wallet_lookup',
      method: 'get',
      params: obj
    })
    return result
  }

  async _makeRequest(axiosRequestObj: AxiosRequestConfig) {
    axiosRequestObj.baseURL = this.comstockEndpoint
    try {
      const resp = await axios(axiosRequestObj)
      return resp.data
    } catch (e) {
      const error = e as AxiosError
      if (error.response?.data?.error) {
        throw new Error(
          `Server returned error: [${error.response.status.toString()}] ${
            error.response.data.error
          }`
        )
      }
      throw error
    }
  }
}
