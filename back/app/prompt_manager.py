import json
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"
INDEX_FILE = PROMPTS_DIR / "index.json"
MAX_PROMPTS = 10


def load_index() -> list[dict]:
    if not INDEX_FILE.exists():
        return []
    with open(INDEX_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_index(index: list[dict]):
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def get_prompts() -> list[dict]:
    """プロンプト一覧を優先順位順で返す"""
    index = load_index()
    result = []
    for item in sorted(index, key=lambda x: x["order"]):
        path = PROMPTS_DIR / item["file"]
        content = path.read_text(encoding="utf-8") if path.exists() else ""
        result.append({
            "order": item["order"],
            "file": item["file"],
            "name": item["name"],
            "content": content
        })
    return result


def get_active_prompt(order: int = 1) -> str:
    """指定した優先順位のプロンプトを返す（デフォルトは1）"""
    index = load_index()
    for item in index:
        if item["order"] == order:
            path = PROMPTS_DIR / item["file"]
            if path.exists():
                return path.read_text(encoding="utf-8")
    # フォールバック：order=1
    for item in index:
        if item["order"] == 1:
            path = PROMPTS_DIR / item["file"]
            if path.exists():
                return path.read_text(encoding="utf-8")
    return ""


def add_prompt(name: str, content: str) -> dict:
    """プロンプトを追加する"""
    index = load_index()
    if len(index) >= MAX_PROMPTS:
        return {"success": False, "message": f"プロンプトは最大{MAX_PROMPTS}個までです"}

    # ファイル名を生成（nameをスネークケースに）
    import re
    safe_name = re.sub(r'[^\w]', '_', name)
    file_name = f"{safe_name}.txt"
    # 重複チェック
    existing_files = [item["file"] for item in index]
    counter = 1
    while file_name in existing_files:
        file_name = f"{safe_name}_{counter}.txt"
        counter += 1

    # 優先順位を決定（既存の最大値+1）
    max_order = max([item["order"] for item in index], default=0)
    new_order = max_order + 1

    # ファイル保存
    path = PROMPTS_DIR / file_name
    path.write_text(content, encoding="utf-8")

    # インデックス更新
    index.append({"order": new_order, "file": file_name, "name": name})
    save_index(index)

    return {"success": True, "message": f"「{name}」を追加しました", "order": new_order, "file": file_name}


def update_prompt(file: str, name: str, content: str) -> dict:
    """プロンプトを更新する"""
    index = load_index()
    for item in index:
        if item["file"] == file:
            item["name"] = name
            path = PROMPTS_DIR / file
            path.write_text(content, encoding="utf-8")
            save_index(index)
            return {"success": True, "message": f"「{name}」を更新しました"}
    return {"success": False, "message": "プロンプトが見つかりません"}


def delete_prompt(file: str) -> dict:
    """プロンプトを削除する"""
    index = load_index()
    target = next((item for item in index if item["file"] == file), None)
    if not target:
        return {"success": False, "message": "プロンプトが見つかりません"}
    if target["order"] == 1 and len(index) == 1:
        return {"success": False, "message": "最後のプロンプトは削除できません"}

    # ファイル削除
    path = PROMPTS_DIR / file
    if path.exists():
        path.unlink()

    # インデックス更新
    index = [item for item in index if item["file"] != file]
    save_index(index)
    return {"success": True, "message": "プロンプトを削除しました"}


def reorder_prompts(orders: list[dict]) -> dict:
    """優先順位を入れ替える: [{"file": "xxx.txt", "order": 1}, ...]"""
    index = load_index()
    file_map = {item["file"]: item for item in index}
    for o in orders:
        if o["file"] in file_map:
            file_map[o["file"]]["order"] = o["order"]
    save_index(list(file_map.values()))
    return {"success": True, "message": "優先順位を更新しました"}
