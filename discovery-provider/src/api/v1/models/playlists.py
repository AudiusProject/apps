from src.api.v1.helpers import make_response
from flask_restx import fields
from src.api.v1.models.users import user_model
from .common import favorite, ns, repost

playlist_artwork = ns.model('playlist_artwork', {
    "150x150": fields.String,
    "480x480": fields.String,
    "1000x1000": fields.String,
})

playlist_track = ns.model('playlist_track', {
    "time": fields.Integer(required=True),
    "track": fields.Integer(required=True)
})

playlist_contents = ns.model('playlist_contents', {
    "track_ids": fields.List(fields.Nested(playlist_track))
})

playlist_model = ns.model('playlist', {
    "artwork": fields.Nested(playlist_artwork, allow_null=True),
    "blockhash": fields.String(required=True),
    "blocknumber": fields.Integer(required=True),
    "created_at": fields.String,
    "description": fields.String,
    "followee_reposts": fields.List(fields.Nested(repost)),
    "followee_saves": fields.List(fields.Nested(favorite)),
    "has_current_user_reposted": fields.Boolean(required=True),
    "has_current_user_saved	true": fields.Boolean(required=True),
    "id": fields.String(required=True),
    "is_album": fields.Boolean(required=True),
    "is_current": fields.Boolean(required=True),
    "is_delete": fields.Boolean(required=True),
    "is_private": fields.Boolean(required=True),
    "playlist_contents": fields.Nested(playlist_contents, required=True),
    "playlist_name": fields.String(required=True),
    "repost_count": fields.Integer(required=True),
    "save_count": fields.Integer(required=True),
    "upc": fields.String,
    "updated_at": fields.String,
    "user": fields.Nested(user_model, required=True),
    "user_id": fields.String(required=True),
})