from flask_restx import fields

from .access_gate import access_gate, extended_access_gate
from .common import favorite, ns, repost
from .extensions.fields import NestedOneOf
from .users import user_model, user_model_full

track_artwork = ns.model(
    "track_artwork",
    {
        "150x150": fields.String,
        "480x480": fields.String,
        "1000x1000": fields.String,
    },
)

track_artwork_full = ns.model(
    "track_artwork_full",
    {
        "150x150": fields.String,
        "480x480": fields.String,
        "1000x1000": fields.String,
        "mirrors": fields.List(fields.String),
    },
)

track_segment = ns.model(
    "track_segment",
    {
        "duration": fields.Float(required=True),
        "multihash": fields.String(required=True),
    },
)

track_element = ns.model(
    "track_element", {"parent_track_id": fields.String(required=True)}
)

remix_parent = ns.model(
    "remix_parent", {"tracks": fields.List(fields.Nested(track_element))}
)

full_remix = ns.model(
    "full_remix",
    {
        "parent_track_id": fields.String(required=True),
        "user": fields.Nested(user_model_full, required=True),
        "has_remix_author_reposted": fields.Boolean(required=True),
        "has_remix_author_saved": fields.Boolean(required=True),
    },
)

full_remix_parent = ns.model(
    "full_remix_parent", {"tracks": fields.List(fields.Nested(full_remix))}
)

stem_parent = ns.model(
    "stem_parent",
    {
        "category": fields.String(required=True),
        "parent_track_id": fields.Integer(required=True),
    },
)

field_visibility = ns.model(
    "field_visibility",
    {
        "mood": fields.Boolean(required=True),
        "tags": fields.Boolean(required=True),
        "genre": fields.Boolean(required=True),
        "share": fields.Boolean(required=True),
        "play_count": fields.Boolean(required=True),
        "remixes": fields.Boolean(required=True),
    },
)

access = ns.model(
    "access",
    {
        "stream": fields.Boolean(required=True),
        "download": fields.Boolean(required=True),
    },
)


album_backlink = ns.model(
    "album_backlink",
    {
        "playlist_id": fields.Integer(required=True),
        "playlist_name": fields.String(required=True),
        "permalink": fields.String(required=True),
    },
)

track = ns.model(
    "Track",
    {
        "artwork": fields.Nested(track_artwork, allow_null=True, required=True),
        "description": fields.String,
        "genre": fields.String(required=True),
        "id": fields.String(required=True),
        "track_cid": fields.String(
            allow_null=True
        ),  # remove nullability after backfill
        "preview_cid": fields.String(allow_null=True),
        "orig_file_cid": fields.String(
            allow_null=True
        ),  # remove nullability after backfill
        "orig_filename": fields.String(
            allow_null=True
        ),  # remove nullability after backfill
        "is_original_available": fields.Boolean(required=True),
        "mood": fields.String,
        "release_date": fields.String,
        "remix_of": fields.Nested(remix_parent),
        "repost_count": fields.Integer(required=True),
        "favorite_count": fields.Integer(required=True),
        "comment_count": fields.Integer(required=True),
        "tags": fields.String,
        "title": fields.String(required=True),
        "user": fields.Nested(user_model, required=True),
        # Total track duration, rounded to the nearest second
        "duration": fields.Integer(required=True),
        "is_downloadable": fields.Boolean(required=True),
        "play_count": fields.Integer(required=True),
        "permalink": fields.String(required=True),
        "is_streamable": fields.Boolean,
        "ddex_app": fields.String(allow_null=True),
        "playlists_containing_track": fields.List(fields.Integer),
        "pinned_comment_id": fields.Integer(allow_null=True),
        "album_backlink": fields.Nested(album_backlink, allow_null=True),
    },
)

blob_info = ns.model(
    "blob_info",
    {
        "size": fields.Integer(required=True),
        "content_type": fields.String(required=True),
    },
)

cover_art = ns.model(
    "cover_art",
    {"150x150": fields.String, "480x480": fields.String, "1000x1000": fields.String},
)


url_with_mirrors = ns.model(
    "url_with_mirrors",
    {
        "url": fields.String(),
        "mirrors": fields.List(fields.String, required=True),
    },
)


track_full = ns.clone(
    "track_full",
    track,
    {
        "artwork": fields.Nested(track_artwork_full, allow_null=True, required=True),
        "access": fields.Nested(
            access,
            required=True,
            description="Describes what access the given user has",
        ),
        "blocknumber": fields.Integer(
            required=True, description="The blocknumber this track was last updated"
        ),
        "create_date": fields.String,
        "cover_art_sizes": fields.String(required=True),
        # TODO: Remove this after images are fetched from `artwork` in the clients
        "cover_art_cids": fields.Nested(cover_art, allow_null=True),
        "created_at": fields.String(required=True),
        "credits_splits": fields.String,
        "isrc": fields.String,
        "license": fields.String,
        "iswc": fields.String,
        "field_visibility": fields.Nested(field_visibility, required=True),
        "followee_reposts": fields.List(fields.Nested(repost), required=True),
        "has_current_user_reposted": fields.Boolean(required=True),
        "is_scheduled_release": fields.Boolean(required=True),
        "is_unlisted": fields.Boolean(required=True),
        "has_current_user_saved": fields.Boolean(required=True),
        "followee_favorites": fields.List(fields.Nested(favorite), required=True),
        "route_id": fields.String(required=True),
        "stem_of": fields.Nested(stem_parent),
        "track_segments": fields.List(fields.Nested(track_segment), required=True),
        "updated_at": fields.String(required=True),
        "user_id": fields.String(required=True),
        "user": fields.Nested(user_model_full, required=True),
        "is_delete": fields.Boolean(required=True),
        "cover_art": fields.String,
        "remix_of": fields.Nested(full_remix_parent, required=True),
        "is_available": fields.Boolean(required=True),
        "ai_attribution_user_id": fields.Integer(allow_null=True),
        "allowed_api_keys": fields.List(fields.String, allow_null=True),
        "audio_upload_id": fields.String,
        "preview_start_seconds": fields.Float,
        "bpm": fields.Float,
        "is_custom_bpm": fields.Boolean,
        "musical_key": fields.String,
        "is_custom_musical_key": fields.Boolean,
        "audio_analysis_error_count": fields.Integer,
        "comments_disabled": fields.Boolean,
        # DDEX fields
        "ddex_release_ids": fields.Raw(allow_null=True),
        "artists": fields.List(fields.Raw, allow_null=True),
        "resource_contributors": fields.List(fields.Raw, allow_null=True),
        "indirect_resource_contributors": fields.List(fields.Raw, allow_null=True),
        "rights_controller": fields.Raw(allow_null=True),
        "copyright_line": fields.Raw(allow_null=True),
        "producer_copyright_line": fields.Raw(allow_null=True),
        "parental_warning_type": fields.String,
        "is_stream_gated": fields.Boolean(
            required=True,
            description="Whether or not the owner has restricted streaming behind an access gate",
        ),
        "stream_conditions": NestedOneOf(
            access_gate,
            allow_null=True,
            description="How to unlock stream access to the track",
        ),
        "is_download_gated": fields.Boolean(
            required=True,
            description="Whether or not the owner has restricted downloading behind an access gate",
        ),
        "download_conditions": NestedOneOf(
            access_gate, allow_null=True, description="How to unlock the track download"
        ),
        "pinned_comment_id": fields.Integer(allow_null=True),
        "cover_original_song_title": fields.String,
        "cover_original_artist": fields.String,
        "is_owned_by_user": fields.Boolean(
            required=True,
            description="Indicates whether the track is owned by the user for MRI sake",
        ),
        "stream": fields.Nested(url_with_mirrors, required=True),
        "download": fields.Nested(url_with_mirrors, required=True),
        "preview": fields.Nested(url_with_mirrors, required=True),
        "album_backlink": fields.Nested(album_backlink, allow_null=True),
    },
)

# Search results may exclude these fields if populated for auto-complete
# TODO: Search results should be entirely different types
# https://linear.app/audius/issue/PAY-3390/split-search-types-out-from-entity-types
search_track_full = ns.clone(
    "search_track_full",
    track_full,
    {
        "followee_reposts": fields.List(fields.Nested(repost), required=False),
        "followee_favorites": fields.List(fields.Nested(favorite), required=False),
    },
)

stem_full = ns.model(
    "stem_full",
    {
        "id": fields.String(required=True),
        "parent_id": fields.String(required=True),
        "category": fields.String(required=True),
        "cid": fields.String(required=True),
        "user_id": fields.String(required=True),
        "blocknumber": fields.Integer(required=True),
        "orig_filename": fields.String(required=True),
    },
)

stem = ns.model(
    "stem",
    {
        "id": fields.String(required=True),
        "parent_id": fields.String(required=True),
        "category": fields.String(required=True),
        "cid": fields.String(required=True),
        "user_id": fields.String(required=True),
        "blocknumber": fields.Integer(required=True),
        "orig_filename": fields.String(required=True),
    },
)

remixes_response = ns.model(
    "remixes_response",
    {
        "count": fields.Integer(required=True),
        "tracks": fields.List(fields.Nested(track_full)),
    },
)


track_access_info = ns.model(
    "track_access_info",
    {
        "access": fields.Nested(
            access, description="Describes what access the given user has"
        ),
        "user_id": fields.String(
            required=True, description="The user ID of the owner of this track"
        ),
        "blocknumber": fields.Integer(
            required=True, description="The blocknumber this track was last updated"
        ),
        "is_stream_gated": fields.Boolean(
            description="Whether or not the owner has restricted streaming behind an access gate"
        ),
        "stream_conditions": NestedOneOf(
            extended_access_gate,
            allow_null=True,
            description="How to unlock stream access to the track",
        ),
        "is_download_gated": fields.Boolean(
            description="Whether or not the owner has restricted downloading behind an access gate"
        ),
        "download_conditions": NestedOneOf(
            extended_access_gate,
            allow_null=True,
            description="How to unlock the track download",
        ),
    },
)
