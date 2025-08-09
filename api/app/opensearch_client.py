from time import sleep
from opensearchpy import OpenSearch

from app.config import settings


def get_opensearch_client() -> OpenSearch:
    client = OpenSearch(settings.opensearch_url, http_compress=True, timeout=10)
    return client


def ensure_index(index_name: str, mappings: dict | None = None, settings_dict: dict | None = None) -> None:
    client = get_opensearch_client()
    # Retry waiting for OpenSearch to start
    for _ in range(30):
        try:
            client.cluster.health()
            break
        except Exception:
            sleep(1)
    try:
        if not client.indices.exists(index=index_name):
            body: dict = {}
            if settings_dict:
                body["settings"] = settings_dict
            if mappings:
                body["mappings"] = mappings
            client.indices.create(index=index_name, body=body)
    except Exception:
        # Ignore during startup
        pass


