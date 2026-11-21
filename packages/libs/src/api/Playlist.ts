import { Base, BaseConstructorArgs, Services } from './base'
export class Playlists extends Base {
  constructor(...args: BaseConstructorArgs) {
    super(...args)
    this.getPlaylists = this.getPlaylists.bind(this)
    this.getLibraryPlaylists = this.getLibraryPlaylists.bind(this)
    this.getLibraryAlbums = this.getLibraryAlbums.bind(this)
  }

  async getPlaylists(
    limit = 100,
    offset = 0,
    idsArray = null,
    targetUserId = null,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getPlaylists(
      limit,
      offset,
      idsArray,
      targetUserId,
      withUsers
    )
  }

  async getLibraryPlaylists(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getLibraryPlaylists(
      limit,
      offset,
      withUsers
    )
  }

  async getLibraryAlbums(limit = 100, offset = 0, withUsers = false) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getLibraryAlbums(
      limit,
      offset,
      withUsers
    )
  }
}
