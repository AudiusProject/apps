from sqlalchemy import (
    ARRAY,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, validates

from src.model_validator import ModelValidator
from src.models.base import Base
from src.models.model_utils import (
    RepresentableMixin,
    get_fields_to_validate,
    validate_field_helper,
)


class User(Base, RepresentableMixin):
    __tablename__ = "users"

    blockhash = Column(Text, nullable=False)
    blocknumber = Column(
        Integer, ForeignKey("blocks.number"), index=True, nullable=False
    )
    user_id = Column(Integer, primary_key=True, nullable=False)
    is_current = Column(Boolean, primary_key=True, nullable=False)
    handle = Column(String)
    wallet = Column(String, index=True)
    name = Column(Text)
    profile_picture = Column(String)
    cover_photo = Column(String)
    bio = Column(String)
    location = Column(String)
    is_storage_v2 = Column(Boolean, nullable=False, server_default=text("false"))
    # Deprecated: Will be removed (https://linear.app/audius/issue/PAY-4018/drop-usersmetadata-multihash)
    metadata_multihash = Column(String)
    creator_node_endpoint = Column(String)
    is_verified = Column(Boolean, nullable=False, server_default=text("false"))
    verified_with_twitter = Column(
        Boolean, nullable=False, server_default=text("false")
    )
    verified_with_instagram = Column(
        Boolean, nullable=False, server_default=text("false")
    )
    verified_with_tiktok = Column(Boolean, nullable=False, server_default=text("false"))
    twitter_handle = Column(String)
    instagram_handle = Column(String)
    tiktok_handle = Column(String)
    website = Column(String)
    donation = Column(String)
    artist_pick_track_id = Column(Integer)
    created_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updated_at = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    handle_lc = Column(String, index=True)
    cover_photo_sizes = Column(String)
    profile_picture_sizes = Column(String)
    primary_id = Column(Integer)
    secondary_ids = Column(ARRAY(Integer()))
    replica_set_update_signer = Column(String)
    txhash = Column(
        String,
        primary_key=True,
        nullable=False,
        server_default=text("''::character varying"),
    )
    playlist_library = Column(JSONB())
    is_deactivated = Column(
        Boolean, nullable=False, index=True, server_default=text("false")
    )
    is_available = Column(Boolean, nullable=False, server_default=text("true"))
    slot = Column(Integer)
    user_storage_account = Column(String)
    user_authority_account = Column(String)
    allow_ai_attribution = Column(Boolean, nullable=False, server_default=text("false"))
    spl_usdc_payout_wallet = Column(String)
    profile_type = Column(String)
    coin_flair_mint = Column(String)

    block1 = relationship(  # type: ignore
        "Block", primaryjoin="User.blocknumber == Block.number"
    )

    ModelValidator.init_model_schemas("User")
    fields = get_fields_to_validate("User")

    # unpacking args into @validates
    @validates(*fields)
    def validate_field(self, field, value):
        return validate_field_helper(field, value, "User", getattr(User, field).type)

    def get_attributes_dict(self):
        return {col.name: getattr(self, col.name) for col in self.__table__.columns}
