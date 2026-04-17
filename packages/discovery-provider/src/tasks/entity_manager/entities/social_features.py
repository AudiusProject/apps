import json
from typing import Union, cast

from src.challenges.challenge_event import ChallengeEvent
from src.exceptions import IndexingValidationError
from src.models.playlists.playlist import Playlist
from src.models.social.follow import Follow
from src.models.social.repost import Repost
from src.models.social.save import Save
from src.models.social.share import Share
from src.models.social.subscription import (
    SUBSCRIPTION_EVENT_ENTITY_TYPE,
    SUBSCRIPTION_USER_ENTITY_TYPE,
    Subscription,
)
from src.models.tracks.remix import Remix
from src.models.tracks.track import Track
from src.tasks.entity_manager.utils import (
    Action,
    EntityType,
    ManageEntityParameters,
    get_record_key,
    validate_signer,
)

action_to_record_types = {
    Action.FOLLOW: [EntityType.FOLLOW, EntityType.SUBSCRIPTION],
    Action.UNFOLLOW: [EntityType.FOLLOW, EntityType.SUBSCRIPTION],
    Action.SAVE: [EntityType.SAVE],
    Action.UNSAVE: [EntityType.SAVE],
    Action.REPOST: [EntityType.REPOST],
    Action.UNREPOST: [EntityType.REPOST],
    Action.SHARE: [EntityType.SHARE],
    Action.SUBSCRIBE: [EntityType.SUBSCRIPTION],
    Action.UNSUBSCRIBE: [EntityType.SUBSCRIPTION],
}


def _subscription_kind(params: ManageEntityParameters) -> str:
    """Map the tx entity_type to the stored subscription.entity_type discriminator."""
    if params.entity_type == EntityType.EVENT:
        return SUBSCRIPTION_EVENT_ENTITY_TYPE
    return SUBSCRIPTION_USER_ENTITY_TYPE

action_to_challenge_event = {
    Action.FOLLOW: ChallengeEvent.follow,
    Action.UNFOLLOW: ChallengeEvent.follow,
    Action.SAVE: ChallengeEvent.favorite,
    Action.UNSAVE: ChallengeEvent.favorite,
    Action.REPOST: ChallengeEvent.repost,
    Action.UNREPOST: ChallengeEvent.repost,
}

create_social_action_types = {
    Action.FOLLOW,
    Action.SAVE,
    Action.REPOST,
    Action.SHARE,
    Action.SUBSCRIBE,
}
delete_social_action_types = {
    Action.UNFOLLOW,
    Action.UNSAVE,
    Action.UNREPOST,
    Action.UNSUBSCRIBE,
}


def create_social_record(params: ManageEntityParameters):
    validate_social_feature(params)

    record_types = action_to_record_types[params.action]
    create_record: Union[Save, Follow, Repost, Share, Subscription, None] = None
    for record_type in record_types:
        if not validate_duplicate_social_feature(record_type, params):
            continue
        if record_type == EntityType.FOLLOW:
            create_record = Follow(
                blockhash=params.event_blockhash,
                blocknumber=params.block_number,
                created_at=params.block_datetime,
                txhash=params.txhash,
                follower_user_id=params.user_id,
                followee_user_id=params.entity_id,
                is_current=True,
                is_delete=False,
            )
        elif record_type == EntityType.SAVE:
            create_record = create_save(params)
        elif record_type == EntityType.REPOST:
            create_record = create_repost(params)
        elif record_type == EntityType.SHARE:
            create_record = create_share(params)
        elif record_type == EntityType.SUBSCRIPTION:
            subscription_kind = _subscription_kind(params)
            # For Event subscriptions, mirror the event_id into the legacy
            # user_id column so existing (subscriber_id, user_id) uniqueness
            # constraints keep working. entity_id carries the same value for
            # new-shape queries.
            create_record = Subscription(
                blockhash=params.event_blockhash,
                blocknumber=params.block_number,
                created_at=params.block_datetime,
                txhash=params.txhash,
                user_id=params.entity_id,
                subscriber_id=params.user_id,
                is_current=True,
                is_delete=False,
                entity_type=subscription_kind,
                entity_id=(
                    params.entity_id
                    if subscription_kind != SUBSCRIPTION_USER_ENTITY_TYPE
                    else None
                ),
            )

        if create_record:
            params.add_record(
                get_record_key(params.user_id, params.entity_type, params.entity_id),
                create_record,
                record_type=record_type,
            )

    # dispatch repost, favorite, follow challenges
    if create_record and params.action in action_to_challenge_event:
        challenge_event = action_to_challenge_event[params.action]
        params.challenge_bus.dispatch(
            challenge_event,
            params.block_number,
            params.block_datetime,
            params.user_id,
        )

    # dispatch verified cosign challenge
    if (
        params.action in [Action.SAVE, Action.REPOST]
        and params.entity_type == EntityType.TRACK
        and params.existing_records[EntityType.TRACK][params.entity_id].remix_of
    ):
        remixed_track = (
            params.session.query(Track)
            .join(Remix, Remix.parent_track_id == Track.track_id)
            .filter(Remix.child_track_id == params.entity_id)
            .first()
        )
        remixer = params.existing_records[EntityType.TRACK][params.entity_id].owner_id
        cosigner = params.existing_records[EntityType.USER][params.user_id]

        if (
            remixed_track
            and remixed_track.owner_id == params.user_id
            and cosigner.is_verified
        ):
            params.challenge_bus.dispatch(
                ChallengeEvent.cosign,
                params.block_number,
                params.block_datetime,
                remixer,
                {
                    "original_track_owner_id": params.user_id,
                    "remix_track_id": params.entity_id,
                    "cosign_date": params.block_datetime.timestamp(),
                },
            )


def get_attribute_from_record_metadata(params, attribute):
    if params.metadata:
        try:
            json_metadata = json.loads(params.metadata)
            attribute = json_metadata.get(attribute, None)
            return attribute
        except Exception as e:
            params.logger.error(
                f"entity_manager | social_features.py | Unable to parse repost metadata while indexing: {e}",
                exc_info=True,
            )
            return None
    return None


def create_save(params):
    is_save_of_repost = get_attribute_from_record_metadata(params, "is_save_of_repost")

    record = Save(
        blockhash=params.event_blockhash,
        blocknumber=params.block_number,
        created_at=params.block_datetime,
        txhash=params.txhash,
        user_id=params.user_id,
        save_item_id=params.entity_id,
        save_type=params.entity_type.lower(),
        is_current=True,
        is_delete=False,
        is_save_of_repost=bool(is_save_of_repost),
    )
    return record


def create_repost(params):
    is_repost_of_repost = get_attribute_from_record_metadata(
        params, "is_repost_of_repost"
    )
    create_record = Repost(
        blockhash=params.event_blockhash,
        blocknumber=params.block_number,
        created_at=params.block_datetime,
        txhash=params.txhash,
        user_id=params.user_id,
        repost_item_id=params.entity_id,
        repost_type=params.entity_type.lower(),
        is_repost_of_repost=bool(is_repost_of_repost),
        is_current=True,
        is_delete=False,
    )
    return create_record


def create_share(params):
    record = Share(
        blockhash=params.event_blockhash,
        blocknumber=params.block_number,
        created_at=params.block_datetime,
        txhash=params.txhash,
        user_id=params.user_id,
        share_item_id=params.entity_id,
        share_type=params.entity_type.lower(),
        slot=params.slot if hasattr(params, "slot") else None,
    )
    return record


def delete_social_record(params):
    validate_social_feature(params)

    record_types = action_to_record_types[params.action]
    deleted_record = None
    for record_type in record_types:
        if not validate_duplicate_social_feature(record_type, params):
            continue
        if record_type == EntityType.FOLLOW:
            deleted_record = Follow(
                blockhash=params.event_blockhash,
                blocknumber=params.block_number,
                follower_user_id=params.user_id,
                followee_user_id=params.entity_id,
                is_current=True,
                is_delete=True,
                created_at=params.block_datetime,
                txhash=params.txhash,
            )
        elif record_type == EntityType.SAVE:
            deleted_record = Save(
                blockhash=params.event_blockhash,
                blocknumber=params.block_number,
                created_at=params.block_datetime,
                txhash=params.txhash,
                user_id=params.user_id,
                save_item_id=params.entity_id,
                save_type=params.entity_type.lower(),
                is_current=True,
                is_delete=True,
            )
        elif record_type == EntityType.REPOST:
            deleted_record = Repost(
                blockhash=params.event_blockhash,
                blocknumber=params.block_number,
                created_at=params.block_datetime,
                txhash=params.txhash,
                user_id=params.user_id,
                repost_item_id=params.entity_id,
                repost_type=params.entity_type.lower(),
                is_current=True,
                is_delete=True,
            )
        elif record_type == EntityType.SUBSCRIPTION:
            subscription_kind = _subscription_kind(params)
            deleted_record = Subscription(
                blockhash=params.event_blockhash,
                blocknumber=params.block_number,
                created_at=params.block_datetime,
                txhash=params.txhash,
                user_id=params.entity_id,
                subscriber_id=params.user_id,
                is_current=True,
                is_delete=True,
                entity_type=subscription_kind,
                entity_id=(
                    params.entity_id
                    if subscription_kind != SUBSCRIPTION_USER_ENTITY_TYPE
                    else None
                ),
            )

        if deleted_record:
            params.add_record(
                get_record_key(params.user_id, params.entity_type, params.entity_id),
                deleted_record,
                record_type=record_type,
            )

    # dispatch repost, favorite, follow challenges
    if deleted_record and params.action in action_to_challenge_event:
        challenge_event = action_to_challenge_event[params.action]
        params.challenge_bus.dispatch(
            challenge_event, params.block_number, params.block_datetime, params.user_id
        )


def validate_social_feature(params: ManageEntityParameters):
    validate_signer(params)

    if params.entity_id not in params.existing_records[params.entity_type]:
        raise IndexingValidationError(f"Entity {params.entity_id} does not exist")

    # Self-action checks come in two flavors depending on the action type.
    if params.action in (
        Action.FOLLOW,
        Action.UNFOLLOW,
        Action.SUBSCRIBE,
        Action.UNSUBSCRIBE,
    ):
        # Follow / subscribe: the "cannot follow yourself" rule only applies
        # when the target is another User. Event / Track / Playlist IDs live
        # in separate ID spaces — a numeric collision between (say) user_id=5
        # and event_id=5 is NOT a self-reference, and the Event row has its
        # own owner via events.user_id anyway.
        if (
            params.entity_type == EntityType.USER
            and params.user_id == params.entity_id
        ):
            raise IndexingValidationError(
                f"User {params.user_id} cannot {params.action} themself"
            )
    else:
        # SAVE / REPOST / SHARE: prevent the user from reposting / favoriting
        # / sharing their own Track or Playlist.
        target_entity = params.existing_records[params.entity_type][params.entity_id]
        owner_id = None
        if params.entity_type == EntityType.PLAYLIST:
            assert isinstance(target_entity, Playlist)
            owner_id = target_entity.playlist_owner_id
        elif hasattr(target_entity, "owner_id"):
            owner_id = target_entity.owner_id
        if owner_id is not None and params.user_id == owner_id:
            raise IndexingValidationError(
                f"User {params.user_id} cannot {params.action} themself"
            )


def validate_duplicate_social_feature(
    record_type: EntityType, params: ManageEntityParameters
):
    # Cannot duplicate a social feature
    key = get_record_key(params.user_id, params.entity_type, params.entity_id)

    existing_record = cast(dict, params.existing_records.get(record_type, {})).get(key)

    if existing_record:
        duplicate_create = (
            params.action
            in (
                Action.REPOST,
                Action.SAVE,
                Action.FOLLOW,
                Action.SUBSCRIBE,
            )
            and not existing_record.is_delete
        ) or (params.action == Action.SHARE)
        duplicate_delete = (
            params.action
            in (Action.UNREPOST, Action.UNSAVE, Action.UNFOLLOW, Action.UNSUBSCRIBE)
            and existing_record.is_delete
        )

        if duplicate_create or duplicate_delete:
            params.logger.debug(
                f"entity_manager.py | User {params.user_id} has already sent a {params.action} for record type {record_type} for {params.entity_type} {params.entity_id}. Skipping"
            )
            return False
    return True
