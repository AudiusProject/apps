from src import api_helpers
from src.utils.config import shared_config
from hashids import Hashids
from flask_restx import fields, reqparse
from src.queries.search_queries import SearchKind

HASH_MIN_LENGTH = 5
HASH_SALT = "azowernasdfoia"

hashids = Hashids(min_length=5, salt=HASH_SALT)

def encode_int_id(id):
    return hashids.encode(id)

def decode_string_id(id):
    # Returns a tuple
    decoded = hashids.decode(id)
    if not len(decoded):
        return None
    return decoded[0]

def make_image(endpoint, cid, width="", height=""):
    return "{e}/ipfs/{cid}/{w}x{h}.jpg".format(e=endpoint, cid=cid, w=width, h=height)

def get_primary_endpoint(user):
    raw_endpoint = user["creator_node_endpoint"]
    if not raw_endpoint:
        return shared_config["discprov"]["user_metadata_service_url"]
    return raw_endpoint.split(",")[0]

def add_track_artwork(track):
    if not "user" in track:
        return track
    endpoint = get_primary_endpoint(track["user"])
    cid = track["cover_art_sizes"]
    if not endpoint or not cid:
        return track
    artwork = {
        "150x150": make_image(endpoint, cid, 150, 150),
        "480x480": make_image(endpoint, cid, 480, 480),
        "1000x1000": make_image(endpoint, cid, 1000, 1000),
    }
    track["artwork"] = artwork
    return track

def add_playlist_artwork(playlist):
    if not "user" in playlist:
        return playlist
    endpoint = get_primary_endpoint(playlist["user"])
    cid = playlist["playlist_image_sizes_multihash"]
    if not endpoint or not cid:
        return playlist
    artwork = {
        "150x150": make_image(endpoint, cid, 150, 150),
        "480x480": make_image(endpoint, cid, 480, 480),
        "1000x1000": make_image(endpoint, cid, 1000, 1000),
    }
    playlist["artwork"] = artwork
    return playlist

def add_user_artwork(user):
    endpoint = get_primary_endpoint(user)
    if not endpoint:
        return user
    cover_cid = user["cover_photo_sizes"]
    profile_cid = user["profile_picture_sizes"]
    if profile_cid:
        profile = {
            "150x150": make_image(endpoint, profile_cid, 150, 150),
            "480x480": make_image(endpoint, profile_cid, 480, 480),
            "1000x1000": make_image(endpoint, profile_cid, 1000, 1000),
        }
        user["profile_picture"] = profile
    if cover_cid:
        cover = {
            "640x": make_image(endpoint, cover_cid, 640),
            "2000x": make_image(endpoint, cover_cid, 2000),
        }
        user["cover_photo"] = cover
    return user

def extend_user(user):
    user_id = encode_int_id(user["user_id"])
    user["id"] = user_id
    user = add_user_artwork(user)
    return user

def extend_repost(repost):
    repost["user_id"] = encode_int_id(repost["user_id"])
    repost["repost_item_id"] = encode_int_id(repost["repost_item_id"])
    return repost

def extend_favorite(favorite):
    favorite["user_id"] = encode_int_id(favorite["user_id"])
    favorite["save_item_id"] = encode_int_id(favorite["save_item_id"])
    return favorite

def extend_remix_of(remix_of):
    def extend_track_element(track):
        track_id = track["parent_track_id"]
        track["parent_track_id"] = encode_int_id(track_id)
        return track

    if not remix_of or not "tracks" in remix_of or not remix_of["tracks"]:
        return remix_of

    remix_of["tracks"] = list(map(extend_track_element, remix_of["tracks"]))
    return remix_of

def extend_track(track):
    track_id = encode_int_id(track["track_id"])
    owner_id = encode_int_id(track["owner_id"])
    if ("user" in track):
        track["user"] = extend_user(track["user"])
    track["id"] = track_id
    track["user_id"] = owner_id
    track["followee_saves"] = list(map(extend_favorite, track["followee_saves"]))
    track["followee_resposts"] = list(map(extend_repost, track["followee_reposts"]))
    track = add_track_artwork(track)
    track["remix_of"] = extend_remix_of(track["remix_of"])
    return track

def extend_playlist(playlist):
    playlist_id = encode_int_id(playlist["playlist_id"])
    owner_id = encode_int_id(playlist["playlist_owner_id"])
    playlist["id"] = playlist_id
    playlist["user_id"] = owner_id
    if ("user" in playlist):
        playlist["user"] = extend_user(playlist["user"])
    playlist = add_playlist_artwork(playlist)
    return playlist

def abort_not_found(identifier, namespace):
    namespace.abort(404, "Oh no! Resource for ID {} not found.".format(identifier))

def decode_with_abort(identifier, namespace):
    decoded = decode_string_id(identifier)
    if decoded is None:
        namespace.abort(404, "Invalid ID: '{}'.".format(identifier))
    return decoded

def make_response(name, namespace, modelType):
    return namespace.model(name, {
        "data": modelType,
    })

def to_dict(multi_dict):
    """Converts a multi dict into a dict where only list entries are not flat"""
    return {k: v if len(v) > 1 else v[0] for (k, v) in multi_dict.to_dict(flat=False).items()}


search_parser = reqparse.RequestParser()
search_parser.add_argument('query', required=True)

trending_parser = reqparse.RequestParser()
trending_parser.add_argument('genre', required=False)
trending_parser.add_argument('time', required=False)

def success_response(entity):
    return api_helpers.success_response(entity, 200, False)
