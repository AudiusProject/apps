from flask_restx import fields

from .common import ns

comment_mention = ns.model(
    "comment_mention",
    {"user_id": fields.Integer(required=True), "handle": fields.String(required=True)},
)

# Replies have a slightly different comment model, similar to base comments
reply_comment_model = ns.model(
    "reply_comment",
    {
        "id": fields.String(required=True),
        "entity_id": fields.String(required=True),
        "entity_type": fields.String(required=True),
        "user_id": fields.String(required=True),
        "message": fields.String(required=True),
        "mentions": fields.List(
            fields.Nested(comment_mention),
            required=False,
        ),
        "track_timestamp_s": fields.Integer(required=False),
        "react_count": fields.Integer(required=True),
        "is_edited": fields.Boolean(required=True),
        "is_current_user_reacted": fields.Boolean(required=False),
        "is_artist_reacted": fields.Boolean(required=False),
        "created_at": fields.String(required=True),
        "updated_at": fields.String(required=False),
        "video_url": fields.String(required=False),
    },
)


# A top level comment, including an array of replies
comment_model = ns.model(
    "comment",
    {
        "id": fields.String(required=True),
        "entity_id": fields.String(required=True),
        "entity_type": fields.String(required=True),
        "user_id": fields.String(required=False),
        "message": fields.String(required=True),
        "mentions": fields.List(
            fields.Nested(comment_mention),
            required=False,
        ),
        "track_timestamp_s": fields.Integer(required=False),
        "react_count": fields.Integer(required=True),
        "reply_count": fields.Integer(required=True),
        "is_edited": fields.Boolean(required=True),
        "is_current_user_reacted": fields.Boolean(required=False),
        "is_artist_reacted": fields.Boolean(required=False),
        "is_tombstone": fields.Boolean(required=False),
        "is_muted": fields.Boolean(required=False),
        "created_at": fields.String(required=True),
        "updated_at": fields.String(required=False),
        "replies": fields.List(fields.Nested(reply_comment_model), require=True),
        "video_url": fields.String(required=False),
    },
)

comment_notification_setting_model = ns.model(
    "comment_notification_setting",
    {"is_muted": fields.Boolean(required=True)},
)
