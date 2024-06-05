from typing import Any, List, Optional, TypedDict

# Required format for track metadata retrieved from the content system


class TrackParent(TypedDict):
    parent_track_id: int


class TrackRemix(TypedDict):
    tracks: List[TrackParent]


class TrackStem(TypedDict):
    parent_track_id: int
    category: str


class TrackFieldVisibility(TypedDict):
    genre: bool
    mood: bool
    play_count: bool
    share: bool
    tags: bool
    remixes: Optional[bool]


class TrackSegment(TypedDict):
    multihash: str
    duration: float


class ResourceContributor(TypedDict):
    name: str
    roles: List[str]
    sequence_number: int


class RightsController(TypedDict):
    name: str
    roles: List[str]
    rights_share_unknown: Optional[str]


class Copyright(TypedDict):
    Year: str
    Text: str


class TrackMetadata(TypedDict):
    track_cid: Optional[str]
    preview_cid: Optional[str]
    orig_file_cid: Optional[str]
    orig_filename: Optional[str]
    is_downloadable: Optional[bool]
    is_original_available: Optional[bool]
    owner_id: Optional[int]
    audio_upload_id: Optional[str]
    title: Optional[str]
    route_id: Optional[str]
    duration: int
    preview_start_seconds: Optional[float]
    cover_art: Optional[str]
    cover_art_sizes: Optional[str]
    tags: Optional[str]
    genre: Optional[str]
    mood: Optional[str]
    credits_splits: Optional[str]
    create_date: None
    release_date: None
    file_type: None
    description: Optional[str]
    license: Optional[str]
    isrc: Optional[str]
    iswc: Optional[str]
    track_segments: List[TrackSegment]
    remix_of: Optional[TrackRemix]
    is_scheduled_release: bool
    is_unlisted: bool
    field_visibility: Optional[TrackFieldVisibility]
    stem_of: Optional[TrackStem]
    is_stream_gated: Optional[bool]
    stream_conditions: Optional[Any]
    is_download_gated: Optional[bool]
    download_conditions: Optional[Any]
    is_playlist_upload: Optional[bool]
    playlists_containing_track: Optional[List[int]]
    ai_attribution_user_id: Optional[int]
    placement_hosts: Optional[str]
    ddex_app: Optional[str]
    ddex_release_ids: Optional[Any]
    artists: Optional[List[ResourceContributor]]
    resource_contributors: Optional[List[ResourceContributor]]
    indirect_resource_contributors: Optional[List[ResourceContributor]]
    rights_controller: Optional[RightsController]
    copyright_line: Optional[Copyright]
    producer_copyright_line: Optional[Copyright]
    parental_warning_type: Optional[str]
    allowed_api_keys: Optional[str]


track_metadata_format: TrackMetadata = {
    "track_cid": None,
    "preview_cid": None,
    "orig_file_cid": None,
    "orig_filename": None,
    "is_downloadable": False,
    "is_original_available": False,
    "owner_id": None,
    "audio_upload_id": None,
    "title": None,
    "route_id": None,
    "duration": 0,
    "preview_start_seconds": None,
    "cover_art": None,
    "cover_art_sizes": None,
    "tags": None,
    "genre": None,
    "mood": None,
    "credits_splits": None,
    "create_date": None,
    "release_date": None,
    "file_type": None,
    "description": None,
    "license": None,
    "isrc": None,
    "iswc": None,
    "track_segments": [],
    "remix_of": None,
    "is_scheduled_release": False,
    "is_unlisted": False,
    "field_visibility": None,
    "stem_of": None,
    "is_stream_gated": False,
    "stream_conditions": None,
    "is_download_gated": False,
    "download_conditions": None,
    "is_playlist_upload": False,
    "playlists_containing_track": None,
    "ai_attribution_user_id": None,
    "placement_hosts": None,
    "ddex_app": None,
    "ddex_release_ids": None,
    "artists": None,
    "resource_contributors": None,
    "indirect_resource_contributors": None,
    "rights_controller": None,
    "copyright_line": None,
    "producer_copyright_line": None,
    "parental_warning_type": None,
    "allowed_api_keys": None,
}

# Required format for user metadata retrieved from the content system
user_metadata_format = {
    "profile_picture": None,
    "profile_picture_sizes": None,
    "cover_photo": None,
    "cover_photo_sizes": None,
    "bio": None,
    "twitter_handle": None,
    "instagram_handle": None,
    "tiktok_handle": None,
    "verified_with_twitter": None,
    "verified_with_instagram": None,
    "verified_with_tiktok": None,
    "website": None,
    "donation": None,
    "name": None,
    "location": None,
    "handle": None,
    "associated_wallets": None,
    "associated_sol_wallets": None,
    "collectibles": None,
    "playlist_library": None,
    "events": None,
    "is_storage_v2": False,
    "is_deactivated": None,
    "artist_pick_track_id": None,
    "allow_ai_attribution": False,
}


class PlaylistMetadata(TypedDict):
    playlist_id: Optional[int]
    playlist_contents: Optional[Any]
    playlist_name: Optional[str]
    playlist_image_sizes_multihash: Optional[str]
    description: Optional[str]
    is_album: Optional[bool]
    is_private: Optional[bool]
    is_image_autogenerated: Optional[bool]
    is_stream_gated: Optional[bool]
    stream_conditions: Optional[Any]
    ddex_app: Optional[str]
    upc: Optional[str]
    ddex_release_ids: Optional[Any]
    artists: Optional[List[ResourceContributor]]
    copyright_line: Optional[Copyright]
    producer_copyright_line: Optional[Copyright]
    parental_warning_type: Optional[str]
    release_date: None


playlist_metadata_format: PlaylistMetadata = {
    "playlist_id": None,
    "playlist_contents": {},
    "playlist_name": None,
    "playlist_image_sizes_multihash": None,
    "description": None,
    "is_album": False,
    "is_private": False,
    "is_image_autogenerated": None,
    "is_stream_gated": False,
    "stream_conditions": None,
    "ddex_app": None,
    "upc": None,
    "ddex_release_ids": None,
    "artists": None,
    "copyright_line": None,
    "producer_copyright_line": None,
    "parental_warning_type": None,
    "release_date": None,
}

# Updates cannot directly modify these fields via metadata
immutable_fields = {
    "blocknumber",
    "blockhash",
    "txhash",
    "created_at",
    "updated_at",
    "slot",
    "metadata_multihash",
    "is_current",
    "is_delete",
}

immutable_playlist_fields = immutable_fields | {
    "playlist_id",
    "playlist_owner_id",
    "is_album",
}

immutable_track_fields = immutable_fields | {
    "track_id",
    "owner_id",
    "track_cid",
    "orig_file_cid",
    "orig_filename",
    "duration",
    "is_available",
}

immutable_user_fields = immutable_fields | {
    "user_id",
    "handle",
    "handle_lc",
    "wallet",
    "is_available",
    "is_verified",
}
