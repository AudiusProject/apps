_db_session_manager = None
_db_read_replica_session_manager = None


def set_session_managers(db, db_read_replica):
    global _db_session_manager, _db_read_replica_session_manager
    _db_session_manager = db
    _db_read_replica_session_manager = db_read_replica


def get_db():
    return _db_session_manager


def get_db_read_replica():
    return _db_read_replica_session_manager
