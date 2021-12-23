import logging

from flask_restx import Namespace, Resource, abort, fields, reqparse
from src.api.v1.helpers import (
    decode_with_abort,
    extend_undisbursed_challenge,
    get_current_user_id,
    make_response,
    success_response,
)
from src.api.v1.models.challenges import (
    attestation,
    create_sender_attestation,
    undisbursed_challenge,
)
from src.queries.get_attestation import (
    AttestationError,
    get_attestation,
    get_create_sender_attestation,
)
from src.queries.get_undisbursed_challenges import get_undisbursed_challenges
from src.utils.db_session import get_db_read_replica
from src.utils.redis_cache import cache

logger = logging.getLogger(__name__)

ns = Namespace("challenges", description="Challenge related operations")

attestation_response = make_response(
    "attestation_reponse", ns, fields.Nested(attestation)
)

attest_route = "/<string:challenge_id>/attest"

attest_parser = reqparse.RequestParser()
attest_parser.add_argument("user_id", required=True)
attest_parser.add_argument("oracle", required=True)
attest_parser.add_argument("specifier", required=True)


@ns.route(attest_route)
class Attest(Resource):
    """Produces an attestation that a given user has completed a challenge, or errors."""

    @ns.marshal_with(attestation_response)
    @ns.expect(attest_parser)
    @cache(ttl_sec=5)
    def get(self, challenge_id: str):
        args = attest_parser.parse_args(strict=True)
        user_id: str = args["user_id"]
        oracle_address: str = args["oracle"]
        specifier: str = args["specifier"]
        decoded_user_id = decode_with_abort(user_id, ns)
        db = get_db_read_replica()
        with db.scoped_session() as session:
            try:
                owner_wallet, signature = get_attestation(
                    session,
                    user_id=decoded_user_id,
                    oracle_address=oracle_address,
                    specifier=specifier,
                    challenge_id=challenge_id,
                )

                return success_response(
                    {"owner_wallet": owner_wallet, "attestation": signature}
                )
            except AttestationError as e:
                abort(400, e)
                return None


undisbursed_route = "/undisbursed"

get_undisbursed_challenges_route_parser = reqparse.RequestParser()
get_undisbursed_challenges_route_parser.add_argument("limit", required=False, type=int)
get_undisbursed_challenges_route_parser.add_argument("offset", required=False, type=int)
get_undisbursed_challenges_route_parser.add_argument(
    "completed_blocknumber", required=False, type=int
)
get_undisbursed_challenges_route_parser.add_argument(
    "user_id", required=False, type=str
)

get_challenges_response = make_response(
    "undisbursed_challenges", ns, fields.List(fields.Nested(undisbursed_challenge))
)


@ns.route(undisbursed_route)
class GetUndisbursedChallenges(Resource):
    @ns.doc(
        params={
            "limit": "The maximum number of response challenges",
            "offset": "The number of challenges to intially skip in the query",
            "completed_blocknumber": "Starting blocknumber to retrieve completed undisbursed challenges",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(get_challenges_response)
    @cache(ttl_sec=5)
    def get(self):
        args = get_undisbursed_challenges_route_parser.parse_args()
        decoded_id = get_current_user_id(args)
        db = get_db_read_replica()

        with db.scoped_session() as session:
            undisbursed_challenges = get_undisbursed_challenges(
                session,
                {
                    "user_id": decoded_id,
                    "limit": args["limit"],
                    "offset": args["offset"],
                    "completed_blocknumber": args["completed_blocknumber"],
                },
            )
            undisbursed_challenges = list(
                map(extend_undisbursed_challenge, undisbursed_challenges)
            )
            return success_response(undisbursed_challenges)


create_sender_attest_route = "/attest_sender"

create_sender_attest_parser = reqparse.RequestParser()
create_sender_attest_parser.add_argument("sender_eth_address", required=True)

create_sender_attestation_response = make_response(
    "attestation_response", ns, fields.Nested(create_sender_attestation)
)


@ns.route(create_sender_attest_route)
class CreateSenderAttestation(Resource):
    """
    Produces an attestation that a specified discovery node is a
    validated on-chain discovery node that can be used to sign challenges.
    """

    @ns.doc(
        params={
            "sender_eth_address": "The address of the discovery node to attest to",
        },
        responses={200: "Success", 400: "Bad request", 500: "Server error"},
    )
    @ns.marshal_with(create_sender_attestation_response)
    @ns.expect(create_sender_attest_parser)
    @cache(ttl_sec=5)
    def get(self):
        args = create_sender_attest_parser.parse_args(strict=True)
        sender_eth_address = args["sender_eth_address"]
        try:
            owner_wallet, attestation = get_create_sender_attestation(
                sender_eth_address
            )
            return success_response(
                {"owner_wallet": owner_wallet, "attestation": attestation}
            )
        except Exception as e:
            abort(400, e)
            return None
