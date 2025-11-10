from flask_restx import fields

from .common import ns
from .extensions.fields import NestedOneOf, OneOfModel


class Any(fields.Raw):
    def format(self, value):
        return value


notification_base = ns.model(
    "notification",
    {
        "type": fields.String(required=True),
        "group_id": fields.String(required=True),
        "is_seen": fields.Boolean(required=True),
        "seen_at": fields.Integer(required=False),
    },
)


notification_action_base = ns.model(
    "notification_action",
    {
        "specifier": fields.String(required=True),
        "type": fields.String(required=True),
        "timestamp": fields.Integer(required=True),
    },
)


follow_notification_action_data = ns.model(
    "follow_notification_action_data",
    {
        "follower_user_id": fields.String(required=True),
        "followee_user_id": fields.String(required=True),
    },
)
follow_notification_action = ns.clone(
    "follow_notification_action",
    notification_action_base,
    {"data": fields.Nested(follow_notification_action_data, required=True)},
)
follow_notification = ns.clone(
    "follow_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(follow_notification_action, required=True), required=True
        ),
    },
)

save_notification_action_data = ns.model(
    "save_notification_action_data",
    {
        "type": fields.String(required=True, enum=["track", "playlist", "album"]),
        "user_id": fields.String(required=True),
        "save_item_id": fields.String(required=True),
    },
)
save_notification_action = ns.clone(
    "save_notification_action",
    notification_action_base,
    {"data": fields.Nested(save_notification_action_data, required=True)},
)
save_notification = ns.clone(
    "save_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(save_notification_action, required=True), required=True
        )
    },
)


repost_notification_action_data = ns.model(
    "repost_notification_action_data",
    {
        "type": fields.String(required=True, enum=["track", "playlist", "album"]),
        "user_id": fields.String(required=True),
        "repost_item_id": fields.String(required=True),
    },
)
repost_notification_action = ns.clone(
    "repost_notification_action",
    notification_action_base,
    {"data": fields.Nested(repost_notification_action_data, required=True)},
)
repost_notification = ns.clone(
    "repost_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(repost_notification_action, required=True), required=True
        )
    },
)


repost_of_repost_notification_action_data = ns.model(
    "repost_of_repost_notification_action_data",
    {
        "type": fields.String(required=True, enum=["track", "playlist", "album"]),
        "user_id": fields.String(required=True),
        "repost_of_repost_item_id": fields.String(required=True),
    },
)
repost_of_repost_notification_action = ns.clone(
    "repost_of_repost_notification_action",
    notification_action_base,
    {"data": fields.Nested(repost_of_repost_notification_action_data, required=True)},
)
repost_of_repost_notification = ns.clone(
    "repost_of_repost_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(repost_of_repost_notification_action, required=True),
            required=True,
        )
    },
)


save_of_repost_notification_action_data = ns.model(
    "save_of_repost_notification_action_data",
    {
        "type": fields.String(required=True, enum=["track", "playlist", "album"]),
        "user_id": fields.String(required=True),
        "save_of_repost_item_id": fields.String(required=True),
    },
)
save_of_repost_notification_action = ns.clone(
    "save_of_repost_notification_action",
    notification_action_base,
    {"data": fields.Nested(save_of_repost_notification_action_data, required=True)},
)
save_of_repost_notification = ns.clone(
    "save_of_repost_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(save_of_repost_notification_action, required=True),
            required=True,
        )
    },
)


tastemaker_notification_action_data = ns.model(
    "tastemaker_notification_action_data",
    {
        "tastemaker_item_owner_id": fields.String(required=True),
        "tastemaker_item_id": fields.String(required=True),
        "action": fields.String(required=True),
        "tastemaker_item_type": fields.String(required=True),
        "tastemaker_user_id": fields.String(required=True),
    },
)
tastemaker_notification_action = ns.clone(
    "tastemaker_notification_action",
    notification_action_base,
    {"data": fields.Nested(tastemaker_notification_action_data, required=True)},
)
tastemaker_notification = ns.clone(
    "tastemaker_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(tastemaker_notification_action, required=True), required=True
        )
    },
)


remix_notification_action_data = ns.model(
    "remix_notification_action_data",
    {
        "parent_track_id": fields.String(required=True),
        "track_id": fields.String(required=True),
        "track_owner_id": fields.String(required=True),
    },
)
remix_notification_action = ns.clone(
    "remix_notification_action",
    notification_action_base,
    {"data": fields.Nested(remix_notification_action_data, required=True)},
)
remix_notification = ns.clone(
    "remix_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(remix_notification_action, required=True), required=True
        )
    },
)

fan_remix_contest_started_notification_action_data = ns.model(
    "fan_remix_contest_started_notification_action_data",
    {
        "entity_user_id": fields.String(required=True),
        "entity_id": fields.String(required=True),
    },
)
fan_remix_contest_started_notification_action = ns.clone(
    "fan_remix_contest_started_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            fan_remix_contest_started_notification_action_data, required=True
        )
    },
)
fan_remix_contest_started_notification = ns.clone(
    "fan_remix_contest_started_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(fan_remix_contest_started_notification_action, required=True),
            required=True,
        )
    },
)

fan_remix_contest_ended_notification_action_data = ns.model(
    "fan_remix_contest_ended_notification_action_data",
    {
        "entity_user_id": fields.String(required=True),
        "entity_id": fields.String(required=True),
    },
)
fan_remix_contest_ended_notification_action = ns.clone(
    "fan_remix_contest_ended_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            fan_remix_contest_ended_notification_action_data, required=True
        )
    },
)
fan_remix_contest_ended_notification = ns.clone(
    "fan_remix_contest_ended_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(fan_remix_contest_ended_notification_action, required=True),
            required=True,
        )
    },
)

fan_remix_contest_ending_soon_notification_action_data = ns.model(
    "fan_remix_contest_ending_soon_notification_action_data",
    {
        "entity_user_id": fields.String(required=True),
        "entity_id": fields.String(required=True),
    },
)
fan_remix_contest_ending_soon_notification_action = ns.clone(
    "fan_remix_contest_ending_soon_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            fan_remix_contest_ending_soon_notification_action_data, required=True
        )
    },
)
fan_remix_contest_ending_soon_notification = ns.clone(
    "fan_remix_contest_ending_soon_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(
                fan_remix_contest_ending_soon_notification_action, required=True
            ),
            required=True,
        )
    },
)

artist_remix_contest_ended_notification_action_data = ns.model(
    "artist_remix_contest_ended_notification_action_data",
    {
        "entity_id": fields.String(required=True),
    },
)
artist_remix_contest_ended_notification_action = ns.clone(
    "artist_remix_contest_ended_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            artist_remix_contest_ended_notification_action_data, required=True
        )
    },
)
artist_remix_contest_ended_notification = ns.clone(
    "artist_remix_contest_ended_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(
                artist_remix_contest_ended_notification_action, required=True
            ),
            required=True,
        )
    },
)

artist_remix_contest_ending_soon_notification_action_data = ns.model(
    "artist_remix_contest_ending_soon_notification_action_data",
    {
        "entity_user_id": fields.String(required=True),
        "entity_id": fields.String(required=True),
    },
)
artist_remix_contest_ending_soon_notification_action = ns.clone(
    "artist_remix_contest_ending_soon_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            artist_remix_contest_ending_soon_notification_action_data, required=True
        )
    },
)
artist_remix_contest_ending_soon_notification = ns.clone(
    "artist_remix_contest_ending_soon_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(
                artist_remix_contest_ending_soon_notification_action, required=True
            ),
            required=True,
        )
    },
)

cosign_notification_action_data = ns.model(
    "cosign_notification_action_data",
    {
        "parent_track_id": fields.String(required=True),
        "parent_track_owner_id": fields.String(required=True),
        "track_id": fields.String(required=True),
        "track_owner_id": fields.String(required=True),
    },
)
cosign_notification_action = ns.clone(
    "cosign_notification_action",
    notification_action_base,
    {"data": fields.Nested(cosign_notification_action_data, required=True)},
)
cosign_notification = ns.clone(
    "cosign_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(cosign_notification_action, required=True), required=True
        )
    },
)


create_playlist_notification_action_data = ns.model(
    "create_playlist_notification_action_data",
    {
        "is_album": fields.Boolean(required=True),
        "playlist_id": fields.List(fields.String(required=True), required=True),
    },
)
create_track_notification_action_data = ns.model(
    "create_track_notification_action_data",
    {
        "track_id": fields.String(required=True),
    },
)
create_notification_action_data = ns.add_model(
    "create_notification_action_data",
    OneOfModel(
        "create_notification_action_data",
        [
            create_playlist_notification_action_data,
            create_track_notification_action_data,
        ],
    ),
)
create_notification_action = ns.clone(
    "create_notification_action",
    notification_action_base,
    {"data": NestedOneOf(create_notification_action_data, required=True)},
)
create_notification = ns.clone(
    "create_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(create_notification_action, required=True), required=True
        )
    },
)


send_tip_notification_action_data = ns.model(
    "send_tip_notification_action_data",
    {
        "amount": fields.String(required=True),
        "sender_user_id": fields.String(required=True),
        "receiver_user_id": fields.String(required=True),
        "tip_tx_signature": fields.String(required=True),
    },
)
send_tip_notification_action = ns.clone(
    "send_tip_notification_action",
    notification_action_base,
    {"data": fields.Nested(send_tip_notification_action_data, required=True)},
)
send_tip_notification = ns.clone(
    "send_tip_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(send_tip_notification_action, required=True), required=True
        )
    },
)


receive_tip_notification_action_data = ns.model(
    "receive_tip_notification_action_data",
    {
        "amount": fields.String(required=True),
        "sender_user_id": fields.String(required=True),
        "receiver_user_id": fields.String(required=True),
        "tip_tx_signature": fields.String(required=True),
        "reaction_value": fields.Integer(required=True),
    },
)
receive_tip_notification_action = ns.clone(
    "receive_tip_notification_action",
    notification_action_base,
    {"data": fields.Nested(receive_tip_notification_action_data, required=True)},
)
receive_tip_notification = ns.clone(
    "receive_tip_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(receive_tip_notification_action, required=True), required=True
        )
    },
)


supporter_dethroned_notification_action_data = ns.model(
    "supporter_dethroned_notification_action_data",
    {
        "dethroned_user_id": fields.String(required=True),
        "sender_user_id": fields.String(required=True),
        "receiver_user_id": fields.String(required=True),
    },
)
supporter_dethroned_notification_action = ns.clone(
    "supporter_dethroned_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            supporter_dethroned_notification_action_data, required=True
        )
    },
)
supporter_dethroned_notification = ns.clone(
    "supporter_dethroned_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(supporter_dethroned_notification_action, required=True),
            required=True,
        )
    },
)


supporter_rank_up_notification_action_data = ns.model(
    "supporter_rank_up_notification_action_data",
    {
        "rank": fields.Integer(required=True),
        "sender_user_id": fields.String(required=True),
        "receiver_user_id": fields.String(required=True),
    },
)
supporter_rank_up_notification_action = ns.clone(
    "supporter_rank_up_notification_action",
    notification_action_base,
    {"data": fields.Nested(supporter_rank_up_notification_action_data, required=True)},
)
supporter_rank_up_notification = ns.clone(
    "supporter_rank_up_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(supporter_rank_up_notification_action, required=True),
            required=True,
        )
    },
)


challenge_reward_notification_action_data = ns.model(
    "challenge_reward_notification_action_data",
    {
        "amount": fields.String(required=True),
        "specifier": fields.String(required=True),
        "challenge_id": fields.String(required=True),
        "listen_streak": fields.Integer(required=False),
    },
)
challenge_reward_notification_action = ns.clone(
    "challenge_reward_notification_action",
    notification_action_base,
    {"data": fields.Nested(challenge_reward_notification_action_data, required=True)},
)
challenge_reward_notification = ns.clone(
    "challenge_reward_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(challenge_reward_notification_action, required=True),
            required=True,
        )
    },
)


claimable_reward_notification_action_data = ns.model(
    "claimable_reward_notification_action_data",
    {
        "amount": fields.String(required=True),
        "specifier": fields.String(required=True),
        "challenge_id": fields.String(required=True),
    },
)
claimable_reward_notification_action = ns.clone(
    "claimable_reward_notification_action",
    notification_action_base,
    {"data": fields.Nested(claimable_reward_notification_action_data, required=True)},
)
claimable_reward_notification = ns.clone(
    "claimable_reward_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(claimable_reward_notification_action, required=True),
            required=True,
        )
    },
)


reaction_notification_action_data = ns.model(
    "reaction_notification_action_data",
    {
        "reacted_to": fields.String(required=True),
        "reaction_type": fields.String(required=True),
        "reaction_value": fields.Integer(required=True),
        "receiver_user_id": fields.String(required=True),
        "sender_user_id": fields.String(required=True),
        "sender_wallet": fields.String(required=True),
        "tip_amount": fields.String(required=True),
    },
)
reaction_notification_action = ns.clone(
    "reaction_notification_action",
    notification_action_base,
    {"data": fields.Nested(reaction_notification_action_data, required=True)},
)
reaction_notification = ns.clone(
    "reaction_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(reaction_notification_action, required=True),
            required=True,
        )
    },
)

user_milestone_notification_action_data = ns.model(
    "user_milestone_notification_action_data",
    {
        "type": fields.String(required=True),
        "threshold": fields.Integer(required=True),
        "user_id": fields.String(required=True),
    },
)
track_milestone_notification_action_data = ns.model(
    "track_milestone_notification_action_data",
    {
        "type": fields.String(required=True),
        "threshold": fields.Integer(required=True),
        "track_id": fields.String(required=True),
    },
)
playlist_milestone_notification_action_data = ns.model(
    "playlist_milestone_notification_action_data",
    {
        "type": fields.String(required=True),
        "threshold": fields.Integer(required=True),
        "playlist_id": fields.String(required=True),
        "is_album": fields.Boolean(required=True),
    },
)
milestone_notification_action_data = ns.add_model(
    "milestone_notification_action_data",
    OneOfModel(
        "milestone_notification_action_data",
        [
            user_milestone_notification_action_data,
            track_milestone_notification_action_data,
            playlist_milestone_notification_action_data,
        ],
    ),
)
milestone_notification_action = ns.clone(
    "milestone_notification_action",
    notification_action_base,
    {"data": NestedOneOf(milestone_notification_action_data, required=True)},
)
milestone_notification = ns.clone(
    "milestone_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(milestone_notification_action, required=True),
            required=True,
        )
    },
)


tier_change_notification_action_data = ns.model(
    "tier_change_notification_action_data",
    {
        "new_tier": fields.String(required=True),
        "current_value": fields.String(required=True),
        "new_tier_value": fields.Integer(required=True),
    },
)
tier_change_notification_action = ns.clone(
    "tier_change_notification_action",
    notification_action_base,
    {"data": fields.Nested(tier_change_notification_action_data, required=True)},
)
tier_change_notification = ns.clone(
    "tier_change_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(tier_change_notification_action, required=True),
            required=True,
        )
    },
)


track_added_to_playlist_notification_action_data = ns.model(
    "track_added_to_playlist_notification_action_data",
    {
        "track_id": fields.String(required=True),
        "playlist_id": fields.String(required=True),
        "playlist_owner_id": fields.String(required=True),
    },
)
track_added_to_playlist_notification_action = ns.clone(
    "track_added_to_playlist_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            track_added_to_playlist_notification_action_data, required=True
        )
    },
)
track_added_to_playlist_notification = ns.clone(
    "track_added_to_playlist_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(track_added_to_playlist_notification_action, required=True),
            required=True,
        )
    },
)


track_added_to_purchased_album_notification_action_data = ns.model(
    "track_added_to_purchased_album_notification_action_data",
    {
        "track_id": fields.String(required=True),
        "playlist_id": fields.String(required=True),
        "playlist_owner_id": fields.String(required=True),
    },
)
track_added_to_purchased_album_notification_action = ns.clone(
    "track_added_to_purchased_album_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            track_added_to_purchased_album_notification_action_data, required=True
        )
    },
)
track_added_to_purchased_album_notification = ns.clone(
    "track_added_to_purchased_album_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(
                track_added_to_purchased_album_notification_action, required=True
            ),
            required=True,
        )
    },
)


usdc_purchase_seller_notification_action_data = ns.model(
    "usdc_purchase_seller_notification_action_data",
    {
        "content_type": fields.String(required=True),
        "buyer_user_id": fields.String(required=True),
        "seller_user_id": fields.String(required=True),
        "amount": fields.String(required=True),
        "extra_amount": fields.String(required=True),
        "content_id": fields.String(required=True),
    },
)
usdc_purchase_seller_notification_action = ns.clone(
    "usdc_purchase_seller_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            usdc_purchase_seller_notification_action_data, required=True
        )
    },
)
usdc_purchase_seller_notification = ns.clone(
    "usdc_purchase_seller_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(usdc_purchase_seller_notification_action, required=True),
            required=True,
        )
    },
)


usdc_purchase_buyer_notification_action_data = ns.model(
    "usdc_purchase_buyer_notification_action_data",
    {
        "content_type": fields.String(required=True),
        "buyer_user_id": fields.String(required=True),
        "seller_user_id": fields.String(required=True),
        "amount": fields.String(required=True),
        "extra_amount": fields.String(required=True),
        "content_id": fields.String(required=True),
    },
)
usdc_purchase_buyer_notification_action = ns.clone(
    "usdc_purchase_buyer_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            usdc_purchase_buyer_notification_action_data, required=True
        )
    },
)
usdc_purchase_buyer_notification = ns.clone(
    "usdc_purchase_buyer_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(usdc_purchase_buyer_notification_action, required=True),
            required=True,
        )
    },
)


request_manager_notification_action_data = ns.model(
    "request_manager_notification_action_data",
    {
        "user_id": fields.String(required=True),
        "grantee_user_id": fields.String(required=True),
        "grantee_address": fields.String(required=True),
    },
)
request_manager_notification_action = ns.clone(
    "request_manager_notification_action",
    notification_action_base,
    {"data": fields.Nested(request_manager_notification_action_data, required=True)},
)
request_manager_notification = ns.clone(
    "request_manager_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(request_manager_notification_action, required=True),
            required=True,
        )
    },
)


approve_manager_request_notification_action_data = ns.model(
    "approve_manager_request_notification_action_data",
    {
        "user_id": fields.String(required=True),
        "grantee_user_id": fields.String(required=True),
        "grantee_address": fields.String(required=True),
    },
)
approve_manager_request_notification_action = ns.clone(
    "approve_manager_request_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            approve_manager_request_notification_action_data, required=True
        )
    },
)
approve_manager_request_notification = ns.clone(
    "approve_manager_request_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(approve_manager_request_notification_action, required=True),
            required=True,
        )
    },
)


trending_notification_action_data = ns.model(
    "trending_notification_action_data",
    {
        "rank": fields.Integer(required=True),
        "genre": fields.String(required=True),
        "track_id": fields.String(required=True),
        "time_range": fields.String(required=True, enum=["week", "month", "year"]),
    },
)
trending_notification_action = ns.clone(
    "trending_notification_action",
    notification_action_base,
    {"data": fields.Nested(trending_notification_action_data, required=True)},
)
trending_notification = ns.clone(
    "trending_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(trending_notification_action, required=True),
            required=True,
        )
    },
)


trending_playlist_notification_action_data = ns.model(
    "trending_playlist_notification_action_data",
    {
        "rank": fields.Integer(required=True),
        "genre": fields.String(required=True),
        "playlist_id": fields.String(required=True),
        "time_range": fields.String(required=True, enum=["week", "month", "year"]),
    },
)
trending_playlist_notification_action = ns.clone(
    "trending_playlist_notification_action",
    notification_action_base,
    {"data": fields.Nested(trending_playlist_notification_action_data, required=True)},
)
trending_playlist_notification = ns.clone(
    "trending_playlist_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(trending_playlist_notification_action, required=True),
            required=True,
        )
    },
)

trending_underground_notification_action_data = ns.model(
    "trending_underground_notification_action_data",
    {
        "rank": fields.Integer(required=True),
        "genre": fields.String(required=True),
        "track_id": fields.String(required=True),
        "time_range": fields.String(required=True, enum=["week", "month", "year"]),
    },
)
trending_underground_notification_action = ns.clone(
    "trending_underground_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            trending_underground_notification_action_data, required=True
        )
    },
)
trending_underground_notification = ns.clone(
    "trending_underground_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(trending_underground_notification_action, required=True),
            required=True,
        )
    },
)


announcement_notification_action_data = ns.model(
    "announcement_notification_action_data",
    {
        "title": fields.String(required=True),
        "push_body": fields.String(required=True),
        "short_description": fields.String(required=True),
        "long_description": fields.String(required=True),
        "route": fields.String(required=True),
    },
)
announcement_notification_action = ns.clone(
    "announcement_notification_action",
    notification_action_base,
    {"data": fields.Nested(announcement_notification_action_data, required=True)},
)
announcement_notification = ns.clone(
    "announcement_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(announcement_notification_action, required=True),
            required=True,
        )
    },
)

comment_notification_action_data = ns.model(
    "comment_notification_action_data",
    {
        "type": fields.String(required=True, enum=["Track", "Playlist", "Album"]),
        "entity_id": fields.String(required=True),
        "comment_user_id": fields.String(required=True),
        "comment_id": fields.String(required=False),
    },
)
comment_notification_action = ns.clone(
    "comment_notification_action",
    notification_action_base,
    {"data": fields.Nested(comment_notification_action_data, required=True)},
)
comment_notification = ns.clone(
    "comment_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(comment_notification_action, required=True), required=True
        )
    },
)

comment_thread_notification_action_data = ns.model(
    "comment_thread_notification_action_data",
    {
        "type": fields.String(required=True, enum=["Track", "Playlist", "Album"]),
        "entity_id": fields.String(required=True),
        "entity_user_id": fields.String(required=True),
        "comment_user_id": fields.String(required=True),
        "comment_id": fields.String(required=False),
    },
)
comment_thread_notification_action = ns.clone(
    "comment_thread_notification_action",
    notification_action_base,
    {"data": fields.Nested(comment_thread_notification_action_data, required=True)},
)
comment_thread_notification = ns.clone(
    "comment_thread_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(comment_thread_notification_action, required=True),
            required=True,
        )
    },
)

comment_mention_notification_action_data = ns.model(
    "comment_mention_notification_action_data",
    {
        "type": fields.String(required=True, enum=["Track", "Playlist", "Album"]),
        "entity_id": fields.String(required=True),
        "entity_user_id": fields.String(required=True),
        "comment_user_id": fields.String(required=True),
        "comment_id": fields.String(required=False),
    },
)
comment_mention_notification_action = ns.clone(
    "comment_mention_notification_action",
    notification_action_base,
    {"data": fields.Nested(comment_mention_notification_action_data, required=True)},
)
comment_mention_notification = ns.clone(
    "comment_mention_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(comment_mention_notification_action, required=True),
            required=True,
        )
    },
)

comment_reaction_notification_action_data = ns.model(
    "comment_reaction_notification_action_data",
    {
        "type": fields.String(required=True, enum=["Track", "Playlist", "Album"]),
        "entity_id": fields.String(required=True),
        "entity_user_id": fields.String(required=True),
        "reacter_user_id": fields.String(required=True),
        "comment_id": fields.String(required=False),
    },
)
comment_reaction_notification_action = ns.clone(
    "comment_reaction_notification_action",
    notification_action_base,
    {"data": fields.Nested(comment_reaction_notification_action_data, required=True)},
)
comment_reaction_notification = ns.clone(
    "comment_reaction_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(comment_reaction_notification_action, required=True),
            required=True,
        )
    },
)

listen_streak_reminder_notification_action_data = ns.model(
    "listen_streak_reminder_notification_action_data",
    {
        "streak": fields.Integer(required=True),
    },
)
listen_streak_reminder_notification_action = ns.clone(
    "listen_streak_reminder_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            listen_streak_reminder_notification_action_data, required=True
        )
    },
)
listen_streak_reminder_notification = ns.clone(
    "listen_streak_reminder_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(listen_streak_reminder_notification_action, required=True),
            required=True,
        )
    },
)

artist_remix_contest_submissions_notification_action_data = ns.model(
    "artist_remix_contest_submissions_notification_action_data",
    {
        "event_id": fields.String(required=True),
        "milestone": fields.Integer(required=True),
        "entity_id": fields.String(required=True),
    },
)
artist_remix_contest_submissions_notification_action = ns.clone(
    "artist_remix_contest_submissions_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            artist_remix_contest_submissions_notification_action_data, required=True
        )
    },
)
artist_remix_contest_submissions_notification = ns.clone(
    "artist_remix_contest_submissions_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(
                artist_remix_contest_submissions_notification_action, required=True
            ),
            required=True,
        )
    },
)

fan_remix_contest_winners_selected_notification_action_data = ns.model(
    "fan_remix_contest_winners_selected_notification_action_data",
    {
        "entity_user_id": fields.String(required=True),
        "entity_id": fields.String(required=True),
    },
)
fan_remix_contest_winners_selected_notification_action = ns.clone(
    "fan_remix_contest_winners_selected_notification_action",
    notification_action_base,
    {
        "data": fields.Nested(
            fan_remix_contest_winners_selected_notification_action_data, required=True
        )
    },
)
fan_remix_contest_winners_selected_notification = ns.clone(
    "fan_remix_contest_winners_selected_notification",
    notification_base,
    {
        "actions": fields.List(
            fields.Nested(
                fan_remix_contest_winners_selected_notification_action, required=True
            ),
            required=True,
        )
    },
)

notification = ns.add_model(
    "notification",
    OneOfModel(
        "notification",
        {
            "follow": follow_notification,
            "save": save_notification,
            "repost": repost_notification,
            "repost_of_repost": repost_of_repost_notification,
            "save_of_repost": save_of_repost_notification,
            "tastemaker": tastemaker_notification,
            "remix": remix_notification,
            "cosign": cosign_notification,
            "create": create_notification,
            "tip_send": send_tip_notification,
            "tip_receive": receive_tip_notification,
            "supporter_dethroned": supporter_dethroned_notification,
            "supporter_rank_up": supporter_rank_up_notification,
            "supporting_rank_up": supporter_rank_up_notification,
            "challenge_reward": challenge_reward_notification,
            "claimable_reward": claimable_reward_notification,
            "reaction": reaction_notification,
            "milestone": milestone_notification,
            "tier_change": tier_change_notification,
            "track_added_to_playlist": track_added_to_playlist_notification,
            "track_added_to_purchased_album": track_added_to_purchased_album_notification,
            "usdc_purchase_seller": usdc_purchase_seller_notification,
            "usdc_purchase_buyer": usdc_purchase_buyer_notification,
            "request_manager": request_manager_notification,
            "approve_manager_request": approve_manager_request_notification,
            "trending": trending_notification,
            "trending_playlist": trending_playlist_notification,
            "trending_underground": trending_underground_notification,
            "announcement": announcement_notification,
            "comment": comment_notification,
            "comment_thread": comment_thread_notification,
            "comment_mention": comment_mention_notification,
            "comment_reaction": comment_reaction_notification,
            "listen_streak_reminder": listen_streak_reminder_notification,
            "fan_remix_contest_started": fan_remix_contest_started_notification,
            "fan_remix_contest_ended": fan_remix_contest_ended_notification,
            "fan_remix_contest_ending_soon": fan_remix_contest_ending_soon_notification,
            "artist_remix_contest_ended": artist_remix_contest_ended_notification,
            "artist_remix_contest_ending_soon": artist_remix_contest_ending_soon_notification,
            "artist_remix_contest_submissions": artist_remix_contest_submissions_notification,
            "fan_remix_contest_winners_selected": fan_remix_contest_winners_selected_notification,
        },
        discriminator="type",
    ),
)


notifications = ns.model(
    "notifications",
    {
        "notifications": fields.List(NestedOneOf(notification)),
        "unread_count": fields.Integer(required=True),
    },
)

playlist_update = ns.model(
    "playlist_update",
    {
        "playlist_id": fields.String(required=True),
        "updated_at": fields.Integer(required=True),
        "last_seen_at": fields.Integer(required=False),
    },
)

playlist_updates = ns.model(
    "playlist_updates",
    {"playlist_updates": fields.List(fields.Nested(playlist_update))},
)
