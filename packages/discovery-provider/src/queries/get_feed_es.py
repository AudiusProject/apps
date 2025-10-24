from src.queries.query_helpers import (
    _populate_gated_content_metadata,
    filter_hidden_tracks,
    get_users_ids,
)
from src.utils.db_session import get_db_read_replica
from src.utils.elasticdsl import (
    ES_PLAYLISTS,
    ES_REPOSTS,
    ES_SAVES,
    ES_TRACKS,
    ES_USERS,
    get_esclient,
    pluck_hits,
    populate_track_or_playlist_metadata_es,
    populate_user_metadata_es,
)


def get_feed_es(args, limit=10, offset=0):
    esclient = get_esclient()
    current_user_id = str(args.get("user_id", None))
    feed_filter = args.get("filter", "all")
    load_reposts = feed_filter in ["repost", "all"]
    load_orig = feed_filter in ["original", "all"]
    # We use size to fetch es results to make sure we get enough results
    size = offset + limit

    explicit_ids = args.get("followee_user_ids", [])

    mdsl = []

    if load_reposts:
        mdsl.extend(
            [
                {"index": ES_REPOSTS},
                {
                    "query": {
                        "bool": {
                            "must": [
                                following_ids_terms_lookup(
                                    current_user_id, "user_id", explicit_ids
                                ),
                                {"term": {"is_delete": False}},
                                {"range": {"created_at": {"gte": "now-30d"}}},
                            ]
                        }
                    },
                    # here doing some over-fetching to de-dupe later
                    # to approximate min_created_at + group by in SQL.
                    "size": 0,
                    "aggs": {
                        "item_key": {
                            "terms": {"field": "item_key", "size": 500},
                            "aggs": {
                                "min_created_at": {"min": {"field": "created_at"}}
                            },
                        }
                    },
                },
            ]
        )

    if load_orig:
        mdsl.extend(
            [
                {"index": ES_TRACKS},
                {
                    "query": {
                        "bool": {
                            "must": [
                                following_ids_terms_lookup(
                                    current_user_id, "owner_id", explicit_ids
                                ),
                                {"term": {"is_unlisted": False}},
                                {"term": {"is_delete": False}},
                            ],
                            "must_not": [{"exists": {"field": "stem_of"}}],
                        }
                    },
                    "size": offset + size,
                    "sort": {"created_at": "desc"},
                },
                {"index": ES_PLAYLISTS},
                {
                    "query": {
                        "bool": {
                            "must": [
                                following_ids_terms_lookup(
                                    current_user_id, "playlist_owner_id", explicit_ids
                                ),
                                {"term": {"is_private": False}},
                                {"term": {"is_delete": False}},
                                {"exists": {"field": "tracks.genre"}},
                            ]
                        }
                    },
                    "size": offset + size,
                    "sort": {"created_at": "desc"},
                },
            ]
        )

    repost_agg = []
    tracks = []
    playlists = []

    founds = esclient.msearch(searches=mdsl)

    if load_reposts:
        repost_agg = founds["responses"].pop(0)
        repost_agg = repost_agg["aggregations"]["item_key"]["buckets"]
        for bucket in repost_agg:
            bucket["created_at"] = bucket["min_created_at"]["value_as_string"]
            bucket["item_key"] = bucket["key"]
        repost_agg.sort(key=lambda b: b["min_created_at"]["value"])

    if load_orig:
        tracks = pluck_hits(founds["responses"].pop(0))
        playlists = pluck_hits(founds["responses"].pop(0))

    # track timestamps and duplicates
    seen = set()
    unsorted_feed = []
    playlist_track_ids = set()

    for playlist in playlists:
        # Q: should es-indexer set item_key on track / playlist too?
        #    instead of doing it dynamically here?
        playlist["item_key"] = item_key(playlist)
        seen.add(playlist["item_key"])
        filter_hidden_tracks(playlist, playlist.get("tracks", []), current_user_id)

        # after having removed hidden tracks from playlists,
        # exclude playlists with no tracks
        if not playlist.get("playlist_contents", {}).get("track_ids", []):
            continue

        unsorted_feed.append(playlist)

        # add playlist track_ids to seen
        # if a user uploads an orig playlist or album
        # supress individual tracks from said album appearing in feed
        for track in playlist["tracks"]:
            seen.add(item_key(track))
            playlist_track_ids.add(track["track_id"])

    for track in tracks:
        track["item_key"] = item_key(track)
        if track["item_key"] in seen:
            continue
        seen.add(track["item_key"])
        unsorted_feed.append(track)

    # remove duplicates from repost feed
    for r in repost_agg:
        k = r["key"]
        if k in seen:
            continue
        seen.add(k)
        unsorted_feed.append(r)

    # sorted feed with repost records
    # the repost records are stubs that we'll now "hydrate"
    # with the related track / playlist
    sorted_with_reposts = sorted(
        unsorted_feed,
        key=lambda entry: entry["created_at"],
        reverse=True,
    )

    # take a "soft limit" here.  Some tracks / reposts might get filtered out below
    # if is_delete
    sorted_with_reposts = sorted_with_reposts[0 : size * 2]

    mget_reposts = []
    keyed_reposts = {}

    # hydrate repost stubs (agg bucket results)
    # min_created_at indicates a repost stub
    for r in sorted_with_reposts:
        if "min_created_at" not in r:
            continue
        (kind, id) = r["key"].split(":")
        if kind == "track":
            mget_reposts.append({"_index": ES_TRACKS, "_id": id})
        else:
            mget_reposts.append({"_index": ES_PLAYLISTS, "_id": id})

    if mget_reposts:
        reposted_docs = esclient.mget(docs=mget_reposts)
        for doc in reposted_docs["docs"]:
            if not doc["found"]:
                # MISSING: a repost for a track or playlist not in the index?
                # this should only happen if repost indexing is running ahead of track / playlist
                # should be transient... but should maybe still be tracked?
                continue
            s = doc["_source"]
            s["item_key"] = item_key(s)
            if (
                s.get("is_delete")
                or s.get("is_private")
                or s.get("is_unlisted")
                or s.get("stem_of")
                or s.get("is_stream_gated")
            ):
                # MISSING: skip reposts for delete, private, unlisted, stem_of, is_stream_gated
                # this is why we took soft limit above
                continue
            if "playlist_id" in s:
                for track in s["playlist_contents"]["track_ids"]:
                    playlist_track_ids.add(track["track"])
            keyed_reposts[s["item_key"]] = s

    # attach playlist tracks
    playlist_tracks = (
        esclient.mget(index=ES_TRACKS, ids=list(playlist_track_ids))
        if len(playlist_track_ids) > 0
        else []
    )
    playlist_tracks_by_id = (
        {d["_id"]: d["_source"] for d in playlist_tracks["docs"] if d["found"]}
        if len(playlist_track_ids) > 0
        else {}
    )

    # replace repost with underlying items
    sorted_feed = []
    for x in sorted_with_reposts:
        if "min_created_at" not in x:
            item = x
            item["activity_timestamp"] = x["created_at"]
        else:
            k = x["key"]
            if k not in keyed_reposts:
                # MISSING: see above
                continue
            item = keyed_reposts[k]
            if "playlist_id" in item:
                item["activity_timestamp"] = x["min_created_at"]["value_as_string"]

        if "playlist_id" in item:
            track_ids = list(
                map(
                    lambda t: t["track"],
                    item.get("playlist_contents", {}).get("track_ids", []),
                )
            )
            tracks = []
            for track_id in track_ids:
                if str(track_id) in playlist_tracks_by_id:
                    tracks.append(playlist_tracks_by_id[str(track_id)])
            # exclude reposted playlists with only hidden tracks
            if len(tracks) > 0 and all([t["is_unlisted"] for t in tracks]):
                continue
            item["tracks"] = tracks

        sorted_feed.append(item)

    # attach users
    user_id_set = set([str(id) for id in get_users_ids(sorted_feed)])
    user_id_set.add(current_user_id)
    user_list = esclient.mget(index=ES_USERS, ids=list(user_id_set))
    user_by_id = {d["_id"]: d["_source"] for d in user_list["docs"] if d["found"]}

    # populate_user_metadata_es:
    current_user = user_by_id.get(str(current_user_id))
    for id, user in user_by_id.items():
        user_by_id[id] = populate_user_metadata_es(user, current_user)

    for item in sorted_feed:
        # GOTCHA: es ids must be strings, but our ids are ints...
        uid = str(item.get("playlist_owner_id", item.get("owner_id")))
        item["user"] = user_by_id[uid]
        if "playlist_id" in item:
            for track in item["tracks"]:
                track["user"] = user_by_id[str(track["owner_id"])]

    (follow_saves, follow_reposts) = fetch_followed_saves_and_reposts(
        current_user, sorted_feed
    )

    for item in sorted_feed:
        item["followee_reposts"] = follow_reposts[item["item_key"]]
        item["followee_saves"] = follow_saves[item["item_key"]]

        # save_count was renamed to favorite_count when working on search...
        # but /feed still expects save_count
        if "favorite_count" in item:
            item["save_count"] = item["favorite_count"]

    # batch populate gated track and collection metadata
    db = get_db_read_replica()
    with db.scoped_session() as session:
        _populate_gated_content_metadata(
            session, sorted_feed, current_user["user_id"], include_playlist_tracks=True
        )

    # populate metadata + remove extra fields from items
    sorted_feed = [
        populate_track_or_playlist_metadata_es(
            item, current_user, include_playlist_tracks=True
        )
        for item in sorted_feed
    ]

    return sorted_feed[offset:size]


def following_ids_terms_lookup(current_user_id, field, explicit_ids=None):
    """
    does a "terms lookup" to query a field
    with the user_ids that the current user follows
    """
    if not explicit_ids:
        explicit_ids = []
    return {
        "bool": {
            "should": [
                {
                    "terms": {
                        field: {
                            "index": ES_USERS,
                            "id": str(current_user_id),
                            "path": "following_ids",
                        },
                    }
                },
                {"terms": {field: explicit_ids}},
            ]
        }
    }


def fetch_followed_saves_and_reposts(current_user, items):
    esclient = get_esclient()
    item_keys = [item_key(i) for i in items]
    follow_reposts = {k: [] for k in item_keys}
    follow_saves = {k: [] for k in item_keys}

    if not current_user or not item_keys:
        return (follow_saves, follow_reposts)

    mget_social_activity = []
    my_friends = set(current_user.get("following_ids", []))

    for item in items:
        key = item_key(item)
        saved_by = item.get("saved_by", [])
        reposted_by = item.get("reposted_by", [])

        save_friends = [f"{uid}:{key}" for uid in saved_by if uid in my_friends]
        for id in save_friends[0:5]:
            mget_social_activity.append({"_index": ES_SAVES, "_id": id})

        repost_friends = [f"{uid}:{key}" for uid in reposted_by if uid in my_friends]
        for id in repost_friends[0:5]:
            mget_social_activity.append({"_index": ES_REPOSTS, "_id": id})

    if mget_social_activity:
        social_activity = esclient.mget(docs=mget_social_activity)
        for doc in social_activity["docs"]:
            if not doc["found"]:
                print("elasticsearch not found", doc)
                continue
            s = doc["_source"]
            if "repost_type" in s:
                follow_reposts[s["item_key"]].append(s)
            else:
                follow_saves[s["item_key"]].append(s)

    return (follow_saves, follow_reposts)


def item_key(item):
    if "item_key" in item:
        return item["item_key"]
    elif "track_id" in item:
        return "track:" + str(item["track_id"])
    elif "playlist_id" in item:
        return "playlist:" + str(item["playlist_id"])
    elif "user_id" in item:
        return "user:" + str(item["user_id"])
    else:
        raise Exception("item_key unknown type")
