import {
  JSONApiResponse,
  HTTPHeaders,
  RequiredError,
  BaseAPI,
  ResolveRequest,
  ResponseError
} from './generated/default'
import {
  instanceOfPlaylist,
  instanceOfTrack,
  instanceOfUser,
  PlaylistResponse,
  PlaylistResponseFromJSON,
  TrackFromJSONTyped,
  PlaylistFromJSONTyped,
  UserFromJSONTyped,
  TrackResponse,
  TrackResponseFromJSON,
  UserResponse,
  UserResponseFromJSON
} from './generated/default/models'

export class ResolveApi extends BaseAPI {
  /**
   * Resolves a provided Audius app URL to the API resource it represents
   */
  async resolveRaw(params: ResolveRequest) {
    if (params.url === null || params.url === undefined) {
      throw new RequiredError(
        'url',
        'Required parameter params.url was null or undefined when calling resolve.'
      )
    }

    const queryParameters: any = {}

    if (params.url !== undefined) {
      queryParameters.url = params.url
    }

    const headerParameters: HTTPHeaders = {}

    const response = await this.request({
      path: `/resolve`,
      method: 'GET',
      headers: headerParameters,
      query: queryParameters
    })
    return new JSONApiResponse(response, (json) => {
      const data = json?.data ?? {}
      if (instanceOfTrack(TrackFromJSONTyped(data, false))) {
        return TrackResponseFromJSON(json)
      } else if (
        Array.isArray(data) &&
        data.length > 0 &&
        instanceOfPlaylist(PlaylistFromJSONTyped(data[0], false))
      ) {
        return PlaylistResponseFromJSON(json)
      } else if (instanceOfUser(UserFromJSONTyped(data, false))) {
        return UserResponseFromJSON(json)
      } else {
        throw new ResponseError(response, 'Invalid response type')
      }
    })
  }

  /**
   * Resolves a provided Audius app URL to the API resource it represents
   */
  async resolve(params: ResolveRequest) {
    return await (await this.resolveRaw(params)).value()
  }

  /**
   * Typeguard to check if a resolve response is a track
   */
  static instanceOfTrackResponse(
    response: TrackResponse | PlaylistResponse | UserResponse
  ): response is TrackResponse {
    return !!response.data && instanceOfTrack(response.data)
  }

  /**
   * Typeguard to check if a resolve response is a playlist
   */
  static instanceOfPlaylistResponse(
    response: TrackResponse | PlaylistResponse | UserResponse
  ): response is PlaylistResponse {
    return (
      !!response.data &&
      Array.isArray(response.data) &&
      !!response.data[0] &&
      instanceOfPlaylist(response.data[0])
    )
  }

  /**
   * Typeguard to check if a resolve response is a user
   */
  static instanceOfUserResponse(
    response: TrackResponse | PlaylistResponse | UserResponse
  ): response is UserResponse {
    return !!response.data && instanceOfUser(response.data)
  }
}
