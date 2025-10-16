from flask_restx import fields

from .common import StringEnumToLower, ns
from .playlist_library import playlist_library

# DEPRECATED
# See connected_wallets
associated_wallets = ns.model(
    "associated_wallets",
    {
        "wallets": fields.List(fields.String, required=True),
        "sol_wallets": fields.List(fields.String, required=True),
    },
)

encoded_user_id = ns.model(
    "encoded_user_id", {"user_id": fields.String(allow_null=True)}
)

profile_picture = ns.model(
    "profile_picture",
    {"150x150": fields.String, "480x480": fields.String, "1000x1000": fields.String},
)

profile_picture_full = ns.model(
    "profile_picture_full",
    {
        "150x150": fields.String,
        "480x480": fields.String,
        "1000x1000": fields.String,
        "mirrors": fields.List(fields.String),
    },
)

cover_photo = ns.model("cover_photo", {"640x": fields.String, "2000x": fields.String})

cover_photo_full = ns.model(
    "cover_photo_full",
    {
        "640x": fields.String,
        "2000x": fields.String,
        "mirrors": fields.List(fields.String),
    },
)

user_model = ns.model(
    "user",
    {
        "album_count": fields.Integer(required=True),
        "artist_pick_track_id": fields.String(allow_null=True),
        "bio": fields.String,
        "cover_photo": fields.Nested(cover_photo, allow_null=True),
        "followee_count": fields.Integer(required=True),
        "follower_count": fields.Integer(required=True),
        "handle": fields.String(required=True),
        "id": fields.String(required=True),
        "is_verified": fields.Boolean(required=True),
        "twitter_handle": fields.String,
        "instagram_handle": fields.String,
        "tiktok_handle": fields.String,
        "verified_with_twitter": fields.Boolean(required=True),
        "verified_with_instagram": fields.Boolean(required=True),
        "verified_with_tiktok": fields.Boolean(required=True),
        "website": fields.String,
        "donation": fields.String,
        "location": fields.String,
        "name": fields.String(required=True),
        "playlist_count": fields.Integer(required=True),
        "profile_picture": fields.Nested(profile_picture, allow_null=True),
        "repost_count": fields.Integer(required=True),
        "track_count": fields.Integer(required=True),
        "is_deactivated": fields.Boolean(required=True),
        "is_available": fields.Boolean(required=True),
        "erc_wallet": fields.String(required=True),
        "spl_wallet": fields.String(required=True),
        "spl_usdc_payout_wallet": fields.String,
        "supporter_count": fields.Integer(required=True),
        "supporting_count": fields.Integer(required=True),
        "total_audio_balance": fields.Integer(required=True),
        "wallet": fields.String(
            required=True,
            description="The user's Ethereum wallet address for their account",
        ),
    },
)

user_model_full = ns.clone(
    "user_full",
    user_model,
    {
        "profile_picture": fields.Nested(profile_picture_full, allow_null=True),
        "cover_photo": fields.Nested(cover_photo_full, allow_null=True),
        "balance": fields.String(required=True),
        "associated_wallets_balance": fields.String(required=True),
        "total_balance": fields.String(required=True),
        "waudio_balance": fields.String(required=True),
        "associated_sol_wallets_balance": fields.String(required=True),
        "blocknumber": fields.Integer(required=True),
        "created_at": fields.String(required=True),
        "is_storage_v2": fields.Boolean(required=True),
        "creator_node_endpoint": fields.String,
        "current_user_followee_follow_count": fields.Integer(required=True),
        "does_current_user_follow": fields.Boolean(required=True),
        "does_current_user_subscribe": fields.Boolean(required=True),
        "does_follow_current_user": fields.Boolean(required=True),
        "handle_lc": fields.String(required=True),
        "updated_at": fields.String(required=True),
        "cover_photo_sizes": fields.String,
        "cover_photo_cids": fields.Nested(cover_photo, allow_null=True),
        "cover_photo_legacy": fields.String,
        "profile_picture_sizes": fields.String,
        "profile_picture_cids": fields.Nested(profile_picture, allow_null=True),
        "profile_picture_legacy": fields.String,
        "playlist_library": fields.Nested(playlist_library, allow_null=True),
        "allow_ai_attribution": fields.Boolean(required=True),
        "profile_type": fields.String(allow_null=True),
    },
)

account_collection_user = ns.model(
    "account_collection_user",
    {
        "id": fields.String(required=True),
        "handle": fields.String(required=True),
        "is_deactivated": fields.Boolean(required=False),
    },
)

account_collection = ns.model(
    "account_collection",
    {
        "id": fields.String(required=True),
        "is_album": fields.Boolean(required=True),
        "name": fields.String(required=True),
        "permalink": fields.String(required=True),
        "user": fields.Nested(account_collection_user, required=True),
    },
)

account_full = ns.model(
    "account_full",
    {
        "user": fields.Nested(user_model_full, required=True),
        "playlists": fields.List(fields.Nested(account_collection), required=True),
        "playlist_library": fields.Nested(playlist_library, allow_null=True),
        "track_save_count": fields.Integer(required=True),
    },
)

connected_wallets = ns.model(
    "connected_wallets",
    {
        "erc_wallets": fields.List(fields.String, required=True),
        "spl_wallets": fields.List(fields.String, required=True),
    },
)

challenge_response = ns.model(
    "challenge_response",
    {
        "challenge_id": fields.String(required=True),
        "user_id": fields.String(required=True),
        "specifier": fields.String(),  # Not required for aggregates
        "is_complete": fields.Boolean(required=True),
        "is_active": fields.Boolean(required=True),
        "is_disbursed": fields.Boolean(required=True),
        "current_step_count": fields.Integer(),
        "max_steps": fields.Integer(),
        "challenge_type": fields.String(required=True),
        "amount": fields.String(required=True),
        "disbursed_amount": fields.Integer(required=True),
        "cooldown_days": fields.Integer(),
        "metadata": fields.Raw(required=True),
    },
)

user_token_profile_picture = ns.model(
    "profilePicture",
    {
        "150x150": fields.String(required=False),
        "480x480": fields.String(required=False),
        "1000x1000": fields.String(required=False),
    },
)

decoded_user_token = ns.model(
    "decoded_user_token",
    {
        "userId": fields.String(required=True),
        "email": fields.String(required=True),
        "name": fields.String(required=True),
        "handle": fields.String(required=True),
        "verified": fields.Boolean(required=True),
        "profilePicture": fields.Nested(
            user_token_profile_picture, allow_null=True, skip_none=True
        ),
        "sub": fields.String(required=True),
        "iat": fields.String(required=True),
    },
)

user_subscribers = ns.model(
    "user_subscribers",
    {
        "user_id": fields.String(required=True),
        "subscriber_ids": fields.List(fields.String),
    },
)

split = ns.model(
    "purchase_split",
    {
        "user_id": fields.Integer(),
        "payout_wallet": fields.String(required=True),
        "amount": fields.String(required=True),
    },
)

purchase = ns.model(
    "purchase",
    {
        "slot": fields.Integer(required=True),
        "signature": fields.String(required=True),
        "seller_user_id": fields.String(required=True),
        "buyer_user_id": fields.String(required=True),
        "amount": fields.String(required=True),
        "extra_amount": fields.String(required=True),
        "content_type": StringEnumToLower(required=True, discriminator=True),
        "content_id": fields.String(required=True),
        "created_at": fields.String(required=True),
        "updated_at": fields.String(required=True),
        "access": StringEnumToLower(required=True),
        "splits": fields.List(fields.Nested(split), required=True),
    },
)

sales_aggregate = ns.model(
    "sales_aggregate",
    {
        "content_type": StringEnumToLower(required=True),
        "content_id": fields.String(required=True),
        "purchase_count": fields.Integer(required=True),
    },
)

remixed_track_aggregate = ns.model(
    "remixed_track_aggregate",
    {
        "track_id": fields.String(required=True),
        "title": fields.String(required=True),
        "remix_count": fields.Integer(required=True),
    },
)

sale_json_model = ns.model(
    "sale_json",
    {
        "title": fields.String(
            description="Title of the content (track/album/playlist)"
        ),
        "link": fields.String(description="Full URL link to the content"),
        "purchased_by": fields.String(description="Name of the buyer"),
        "buyer_user_id": fields.Integer(
            description="User ID of the buyer", allow_null=True
        ),
        "date": fields.String(
            description="ISO format date string of when the sale occurred"
        ),
        "sale_price": fields.Float(description="Base sale price in USDC"),
        "network_fee": fields.Float(
            description="Network fee deducted from sale in USDC"
        ),
        "pay_extra": fields.Float(description="Extra amount paid by buyer in USDC"),
        "total": fields.Float(description="Total amount received by seller in USDC"),
        "country": fields.String(
            description="Country code where purchase was made", allow_null=True
        ),
        "encrypted_email": fields.String(
            description="Encrypted email of buyer if available", allow_null=True
        ),
        "encrypted_key": fields.String(
            description="Encrypted key for decrypting the buyer's email",
            allow_null=True,
        ),
        "is_initial": fields.Boolean(
            description="Whether this is an initial encryption from the backfill",
            allow_null=True,
        ),
        "pubkey_base64": fields.String(
            description="Base64 encoded public key of the buyer",
            allow_null=True,
        ),
    },
)

sales_json_content = ns.model(
    "sales_json_content",
    {
        "sales": fields.List(fields.Nested(sale_json_model)),
    },
)

email_access = ns.model(
    "email_access",
    {
        "id": fields.Integer(required=True),
        "email_owner_user_id": fields.Integer(required=True),
        "receiving_user_id": fields.Integer(required=True),
        "grantor_user_id": fields.Integer(required=True),
        "encrypted_key": fields.String(required=True),
        "is_initial": fields.Boolean(required=True),
        "created_at": fields.String(required=True),
        "updated_at": fields.String(required=True),
    },
)
