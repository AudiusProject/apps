import snakecaseKeys from 'snakecase-keys'

import { UninitializedEntityManagerError } from '../../errors'
import {
  EntityManagerService,
  EntityType,
  Action
} from '../../services/EntityManager/types'
import { decodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
import {
  Configuration,
  EventsApi as GeneratedEventsApi,
  type FollowEventRequest,
  type UnfollowEventRequest
} from '../generated/default'

import {
  CreateEventRequest,
  CreateEventSchema,
  UpdateEventRequest,
  UpdateEventSchema,
  DeleteEventRequest,
  DeleteEventSchema,
  EntityManagerFollowEventRequest,
  EntityManagerFollowEventSchema,
  EntityManagerUnfollowEventRequest,
  EntityManagerUnfollowEventSchema,
  type EventsApiServicesConfig
} from './types'

export class EventsApi extends GeneratedEventsApi {
  private readonly entityManager?: EntityManagerService

  constructor(configuration: Configuration, services: EventsApiServicesConfig) {
    super(configuration)
    this.entityManager = services.entityManager
  }

  async generateEventId() {
    const response = await this.getUnclaimedEventID()
    const { data: unclaimedId } = response
    if (!unclaimedId) {
      return Math.floor(Math.random() * 1000000)
    }
    return decodeHashId(unclaimedId)!
  }

  /**
   * Create an event
   */
  async createEvent(params: CreateEventRequest) {
    const parsedParameters = await parseParams(
      'createEvent',
      CreateEventSchema
    )(params)

    const {
      userId,
      eventId,
      eventType,
      entityType,
      entityId: eventEntityId,
      endDate,
      eventData
    } = parsedParameters
    const entityId = eventId ?? (await this.generateEventId())

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const response = await this.entityManager.manageEntity({
      entityId,
      userId,
      entityType: EntityType.EVENT,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({
          eventType,
          entityType,
          entityId: eventEntityId,
          endDate,
          eventData
        })
      })
    })
    return response
  }

  /**
   * Update an event
   */
  async updateEvent(params: UpdateEventRequest) {
    const parsedParameters = await parseParams(
      'updateEvent',
      UpdateEventSchema
    )(params)

    const { userId, eventId, endDate, eventData } = parsedParameters
    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const response = await this.entityManager.manageEntity({
      entityId: eventId,
      userId,
      entityType: EntityType.EVENT,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys({ endDate, eventData })
      })
    })
    return response
  }

  /**
   * @hidden
   * Follow (subscribe to) a remix-contest event via the entity manager —
   * submits a Subscribe/Event ManageEntity transaction directly from the
   * client. The indexer writes a row into `subscriptions` tagged with
   * entity_type='Event'; next time the event owner posts an update, the
   * follower receives a notification.
   */
  async followEventWithEntityManager(
    params: EntityManagerFollowEventRequest
  ) {
    const { userId, eventId } = await parseParams(
      'followEvent',
      EntityManagerFollowEventSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return this.entityManager.manageEntity({
      entityId: eventId,
      userId,
      entityType: EntityType.EVENT,
      action: Action.SUBSCRIBE,
      metadata: ''
    })
  }

  /**
   * Follow a remix-contest event. When called with the entity-manager
   * shape (numeric `userId`) the client submits the tx directly; otherwise
   * we fall through to the generated HTTP path which routes through the
   * api's `POST /v1/events/{eventId}/follow` endpoint. Mirrors the
   * followUser dual-path pattern.
   */
  override async followEvent(
    params: EntityManagerFollowEventRequest | FollowEventRequest,
    requestInit?: RequestInit
  ) {
    if (
      this.entityManager &&
      'userId' in params &&
      typeof (params as EntityManagerFollowEventRequest).userId === 'number'
    ) {
      return await this.followEventWithEntityManager(
        params as EntityManagerFollowEventRequest
      )
    }
    return super.followEvent(params as FollowEventRequest, requestInit)
  }

  /**
   * @hidden
   * Unfollow a remix-contest event via the entity manager.
   */
  async unfollowEventWithEntityManager(
    params: EntityManagerUnfollowEventRequest
  ) {
    const { userId, eventId } = await parseParams(
      'unfollowEvent',
      EntityManagerUnfollowEventSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return this.entityManager.manageEntity({
      entityId: eventId,
      userId,
      entityType: EntityType.EVENT,
      action: Action.UNSUBSCRIBE,
      metadata: ''
    })
  }

  override async unfollowEvent(
    params: EntityManagerUnfollowEventRequest | UnfollowEventRequest,
    requestInit?: RequestInit
  ) {
    if (
      this.entityManager &&
      'userId' in params &&
      typeof (params as EntityManagerUnfollowEventRequest).userId === 'number'
    ) {
      return await this.unfollowEventWithEntityManager(
        params as EntityManagerUnfollowEventRequest
      )
    }
    return super.unfollowEvent(params as UnfollowEventRequest, requestInit)
  }

  /**
   * Delete an event
   */
  async deleteEvent(params: DeleteEventRequest) {
    const parsedParameters = await parseParams(
      'deleteEvent',
      DeleteEventSchema
    )(params)

    const { userId, eventId } = parsedParameters

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    const response = await this.entityManager.manageEntity({
      entityId: eventId,
      userId,
      entityType: EntityType.EVENT,
      action: Action.DELETE,
      metadata: ''
    })
    return response
  }
}
