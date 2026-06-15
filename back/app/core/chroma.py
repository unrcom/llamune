import chromadb
from chromadb.config import DEFAULT_TENANT, DEFAULT_DATABASE, Settings
from app.core.config import CHROMA_DB_DIR

_client = None


def _create_client():
    return chromadb.PersistentClient(
        path=CHROMA_DB_DIR,
        settings=Settings(anonymized_telemetry=False),
        tenant=DEFAULT_TENANT,
        database=DEFAULT_DATABASE,
    )


def get_chroma_client():
    global _client

    if _client is not None:
        try:
            _client.heartbeat()
            return _client
        except Exception:
            _client = None

    _client = _create_client()
    return _client
