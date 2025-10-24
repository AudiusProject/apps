from typing import Literal

# These are the different types of content that can be made gated.
# For now, we only support tracks.
GatedContentType = Literal["track", "album"]

# These are the different conditions on which gated content access
# will be gated.
# They should match the GatedConditions property in the track schema
# in src/schemas/track_schema.json
GatedContentConditions = Literal[
    "nft_collection", "follow_user_id", "tip_user_id", "usdc_purchase", "token_gate"
]

# This is for when we support the combination of different conditions
# for gated content access based on AND'ing / OR'ing them together.
GatedContentConditionGates = Literal["AND", "OR"]
