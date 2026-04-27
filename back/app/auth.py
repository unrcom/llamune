import os
from fastapi import Header, HTTPException, status

def load_api_keys() -> dict[str, str]:
    """
    環境変数 API_KEYS から {key: username} の辞書を生成する
    形式: API_KEYS=alice:key-abc123,bob:key-xyz789
    """
    raw = os.getenv("API_KEYS", "")
    keys = {}
    for entry in raw.split(","):
        entry = entry.strip()
        if ":" not in entry:
            continue
        username, key = entry.split(":", 1)
        keys[key.strip()] = username.strip()
    return keys

API_KEYS: dict[str, str] = load_api_keys()


def get_current_user(x_api_key: str = Header(...)) -> str:
    """
    X-API-Key ヘッダーを検証してユーザー名を返す
    """
    user = API_KEYS.get(x_api_key)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="APIキーが無効です"
        )
    return user
