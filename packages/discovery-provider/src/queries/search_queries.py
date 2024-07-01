import logging  # pylint: disable=C0302
from enum import Enum

from flask import Blueprint, request

from src import api_helpers, exceptions
from src.queries.query_helpers import get_current_user_id, get_pagination_vars
from src.queries.search_es import search_es_full, search_tags_es

logger = logging.getLogger(__name__)
bp = Blueprint("search_tags", __name__)


# ####### VARS ####### #


class SearchKind(Enum):
    all = 1
    tracks = 2
    users = 3
    playlists = 4
    albums = 5


# ####### ROUTES ####### #


@bp.route("/search/tags", methods=("GET",))
def search_tags():
    validSearchKinds = [SearchKind.all, SearchKind.tracks, SearchKind.users]
    search_str = request.args.get("query", type=str)
    current_user_id = get_current_user_id(required=False)
    kind = request.args.get("kind", type=str, default="all")
    if not search_str:
        raise exceptions.ArgumentError("Invalid value for parameter 'query'")

    try:
        searchKind = SearchKind[kind]
        if searchKind not in validSearchKinds:
            raise Exception
    except Exception:
        return api_helpers.error_response(
            f"Invalid value for parameter 'kind' must be in {[k.name for k in validSearchKinds]}",
            400,
        )

    (limit, offset) = get_pagination_vars()

    hits = search_tags_es(
        {
            **request.args,
            "query": search_str,
            "kind": kind,
            "current_user_id": current_user_id,
            "limit": limit,
            "offset": offset,
        }
    )
    return api_helpers.success_response(hits)


def search(args):
    """Perform a search. `args` should contain `is_auto_complete`,
    `query`, `kind`, `current_user_id`, and `only_downloadable`
    """

    return search_es_full(args)
