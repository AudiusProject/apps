---
sidebar_label: Architecture
sidebar_position: 2
---

# Architecture

## Database

The discovery node uses PostgreSQL. Our Postgres database is managed through [SQLAlchemy](https://www.sqlalchemy.org/), an object relational mapper and [Alembic](http://alembic.zzzcomputing.com/en/latest/index.html), a lightweight database migration tool. The data models are defined in [src/models.py](https://github.com/AudiusProject/apps/blob/main/discovery-provider/src/models.py) which is used by alembic to automatically generate the migrations under [alembic/versions](https://github.com/AudiusProject/apps/tree/main/discovery-provider/alembic/versions). You can find the connection defined between alembic and our data models in [alembic/env.py](https://github.com/AudiusProject/audius-discovery-provider/blob/develop/alembic/env.py)

## Flask

The discovery node web server serves as the entrypoint for reading data through the audius protocol. All queries are returned as JSON objects parsed from SQLAlchemy query resultsn, and can be found in [src/queries](https://github.com/AudiusProject/apps/tree/main/discovery-provider/src/queries). Some examples of queries include user-specific feeds, track data, playlist data, etc.

## Celery

Celery is simply a task queue - it allows us to define a set of single tasks repeated throughout the lifetime of the discovery node.

Currently, a single task `(src/tasks/index.py:update_task()`) handles **all database write** operations. The flask application reads from our database and is unaware of data correctness.

Celery **worker** and **beat** are the key underlying concepts behind celery usage in the discovery node. Celery beat is responsible for periodically scheduling index tasks and is run as a separate container from the worker. Details about periodic task scheduling can be found in the [official documentation](http://docs.celeryproject.org/en/latest/userguide/periodic-tasks.html).

Celery worker is the component that actually runs tasks.

### Celery Worker

The primary driver of data availability on audius is the 'index_blocks' celery task.
What happens when 'index_blocks' is actually executed? The celery task does the following operations:

1. Check whether the latest block is different than the last processed block in the ‘blocks’ table. If so, an array of blocks is generated from the last blockhash present in our database up to the latest block number specified by the block indexing window. 
    - block indexing window is equivalent to the maximum number of blocks to be processed in a single indexing operation
2. Traverse over each block in the block array produced after the above step. 

    In each block, check if any transactions relevant to the audius smart contracts are present. If present, we retrieve specific event information from the associated transaction hash - examples include creator and track metadata. To do so, the discovery node *must* be aware of both the contract ABIs as well as each contract's address - these are shipped with each discovery node image. 

3. Given operations from audius contracts in a given block, the task updates the corresponding table in the database. Certain index operations require a metadata fetch from decentralized storage (Audius Storage Protocol). Metadata formats can be found [here](https://github.com/AudiusProject/apps/blob/main/discovery-provider/src/tasks/metadata.py).

*Why index blocks instead of using event filters?*

This is a great question - the main reason we have chosen to index blocks in this manner is to handle cases of false progress and rollback. Each indexing task opens a fresh database session, which means DB transactions can be reverted at a block level - while rollback handling for the discovery node has yet to be implemented, block-level indexing will be immediately useful when it becomes necessary.

### Celery Beat

Identical container as the celery worker but is run as a 'beat scheduler' to ensure indexing is run at a periodic interval. By default this interval is 5 seconds.

## Redis

We use Redis for several things in the discovery node

1. Caching (internally and externally)
2. As a [broker for Celery](http://docs.celeryproject.org/en/latest/getting-started/brokers/redis.html)
3. As a mechanism for locking to ensure single execution contexts for Celery jobs

## Elastic Search

Elastic Search is used denormalize data and support certain quries (Feed, Search, Related Artists, etc.). Elastic Search data is populated and kept up to date by database triggers that live on the Postgres database.

ETL code for the Elastic Search layer is found in the [es-indexer](https://github.com/AudiusProject/apps/tree/main/discovery-provider/es-indexer).