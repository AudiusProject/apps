import logging

from flask_restx import Namespace, Resource, fields

from src.api.v1.helpers import make_response, success_response
from src.queries.get_cid_type_data import get_cid_type_data
from src.utils.redis_cache import cache
from src.utils.redis_metrics import record_metrics

logger = logging.getLogger(__name__)

full_ns = Namespace("cid_data", description="Metadata related operations")


def get_data(cid: str):
    """Returns a single metadata, or None"""
    type, metadata = get_cid_type_data(cid)
    return type, metadata


CID_METADATA_ROUTE = "/<string:metadata_id>"

cid_data = full_ns.model(
    "cid_data",
    {
        "associated_sol_wallets": fields.Raw(required=False),
        "associated_wallets": fields.Raw(required=False),
    },
)

data_and_type = full_ns.model(
    "data_and_type",
    {
        "type": fields.String,
        "data": fields.Nested(cid_data),
    },
)

cid_data_response = make_response(
    "cid_data_response", full_ns, fields.Nested(data_and_type)
)


@full_ns.route(CID_METADATA_ROUTE)
class Metadata(Resource):
    @record_metrics
    @full_ns.doc(
        id="""Get Metadata""",
        description="""Get a metadata by CID""",
        params={"metadata_id": "A Metdata CID"},
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @full_ns.marshal_with(cid_data_response)
    @cache(ttl_sec=5)
    def get(self, metadata_id):
        type, data = get_data(metadata_id)
        response = success_response({"type": type, "data": data})
        return response
