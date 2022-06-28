import datetime

from datasketch import MinHash, MinHashLSHForest
from psycopg2.extras import execute_values
from sqlalchemy.orm import Session

top_k = 100


def update_related_artist_minhash(session: Session):

    engine = session.get_bind()
    connection = engine.raw_connection()
    cursor = connection.cursor()

    cursor.execute("truncate table related_artists;")

    cursor.execute(
        """
        select 
            followee_user_id,
            array_agg(follower_user_id)
        from follows 
        join aggregate_user on followee_user_id = aggregate_user.user_id
        where is_current and not is_delete
        and followee_user_id != 51
        and track_count > 0
        and follower_count > 10
        group by 1
        """
    )

    forest = MinHashLSHForest(num_perm=128)

    user_mh = {}
    follower_counts = {}

    for (user_id, follower_ids) in cursor:
        ids = [str(id).encode("utf8") for id in follower_ids]
        mh = MinHash(num_perm=128)
        mh.update_batch(ids)

        user_mh[user_id] = mh
        follower_counts[user_id] = len(follower_ids)
        forest.add(user_id, mh)

    forest.index()

    for user_id, mh in user_mh.items():

        # 2x overfetch with rescore to improve accuracy:
        # http://ekzhu.com/datasketch/lshforest.html#tips-for-improving-accuracy
        similar = forest.query(mh, top_k * 2)
        created_at = datetime.datetime.now()

        rows = []
        for other_id in similar:
            if other_id == user_id:
                continue
            mh2 = user_mh[other_id]
            score = mh.jaccard(mh2)
            rows.append((user_id, other_id, score, created_at))

        rows = sorted(rows, key=lambda x: x[2], reverse=True)[:top_k]

        insert_query = "insert into related_artists (user_id, related_artist_user_id, score, created_at) values %s"
        execute_values(cursor, insert_query, rows, template=None, page_size=100)

    connection.commit()
    connection.close()
