import chromadb
import wikipediaapi
from pathlib import Path
from FlagEmbedding import FlagModel

CHROMA_PATH = str(Path.home() / "dev/llamune/back/chroma_db_drug")
MIN_CHARS = 50

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection("drug_rag")


def get_sources() -> list[dict]:
    all_items = collection.get()
    source_counts: dict[str, int] = {}
    for meta in all_items["metadatas"]:
        source = meta.get("source", "unknown")
        source_counts[source] = source_counts.get(source, 0) + 1
    return [{"source": s, "chunk_count": c} for s, c in sorted(source_counts.items())]


def delete_source(source: str) -> int:
    all_items = collection.get()
    ids_to_delete = [
        id_ for id_, meta in zip(all_items["ids"], all_items["metadatas"])
        if meta.get("source") == source
    ]
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)
    return len(ids_to_delete)


def split_by_paragraph(text: str, min_chars: int = MIN_CHARS) -> list[str]:
    chunks = []
    for para in text.split("\n\n"):
        para = para.strip()
        if len(para) >= min_chars:
            chunks.append(para)
    return chunks


def collect_chunks(sections, parent_title: str = "") -> list[dict]:
    chunks = []
    for section in sections:
        heading = f"{parent_title} > {section.title}" if parent_title else section.title
        for chunk in split_by_paragraph(section.text):
            chunks.append({"heading": heading, "text": chunk})
        if section.sections:
            chunks.extend(collect_chunks(section.sections, heading))
    return chunks


def fetch_wikipedia_chunks(title: str) -> list[dict]:
    wiki = wikipediaapi.Wikipedia(language="ja", user_agent="llamune/1.0")
    page = wiki.page(title)
    if not page.exists():
        return []
    all_chunks = []
    for chunk in split_by_paragraph(page.summary):
        all_chunks.append({"heading": "概要", "text": chunk})
    all_chunks.extend(collect_chunks(page.sections))
    return all_chunks


def add_wikipedia(title: str, embed_model: FlagModel) -> dict:
    chunks = fetch_wikipedia_chunks(title)
    if not chunks:
        return {"success": False, "message": f"Wikipediaページ「{title}」が見つかりません"}

    existing_ids = set(collection.get()["ids"])
    prefix = title.replace(" ", "_")
    new_texts, new_ids, new_metadatas = [], [], []

    for i, chunk in enumerate(chunks):
        cid = f"{prefix}__{chunk['heading']}__{i}"
        if cid not in existing_ids:
            new_texts.append(chunk["text"])
            new_ids.append(cid)
            new_metadatas.append({"source": title, "heading": chunk["heading"]})

    if not new_texts:
        return {"success": False, "message": f"「{title}」は既に登録済みです"}

    embeddings = embed_model.encode(new_texts).tolist()
    collection.add(documents=new_texts, embeddings=embeddings, ids=new_ids, metadatas=new_metadatas)
    return {"success": True, "message": f"「{title}」を追加しました", "chunk_count": len(new_texts)}


def refresh_source(title: str, embed_model: FlagModel) -> dict:
    deleted = delete_source(title)
    result = add_wikipedia(title, embed_model)
    result["deleted_count"] = deleted
    return result


def get_chunks(source: str) -> list[dict]:
    """指定ソースのチャンク一覧をID・見出し・テキスト付きで返す"""
    all_items = collection.get()
    chunks = []
    for id_, meta, doc in zip(all_items["ids"], all_items["metadatas"], all_items["documents"]):
        if meta.get("source") == source:
            parts = id_.split("__")
            index = parts[-1] if len(parts) >= 3 else "0"
            chunks.append({
                "id": id_,
                "heading": meta.get("heading", ""),
                "index": int(index),
                "text": doc
            })
    chunks.sort(key=lambda x: x["index"])
    return chunks


def update_chunk(chunk_id: str, new_text: str, embed_model: FlagModel) -> dict:
    """チャンクのテキストを更新する"""
    all_items = collection.get()
    if chunk_id not in all_items["ids"]:
        return {"success": False, "message": "チャンクが見つかりません"}

    idx = all_items["ids"].index(chunk_id)
    meta = all_items["metadatas"][idx]

    embedding = embed_model.encode([new_text]).tolist()
    collection.update(
        ids=[chunk_id],
        documents=[new_text],
        embeddings=embedding,
        metadatas=[meta]
    )
    return {"success": True, "message": "チャンクを更新しました"}


def delete_chunk(chunk_id: str) -> dict:
    """チャンクを1件削除する"""
    all_items = collection.get()
    if chunk_id not in all_items["ids"]:
        return {"success": False, "message": "チャンクが見つかりません"}
    collection.delete(ids=[chunk_id])
    return {"success": True, "message": "チャンクを削除しました"}


def chunk_text(text: str, separator: str = "@@@") -> list[str]:
    """テキストをチャンクに分割する"""
    # セパレータが含まれている場合はそれで分割
    if separator in text:
        chunks = [c.strip() for c in text.split(separator)]
        return [c for c in chunks if len(c) >= MIN_CHARS]

    # 自動チャンキング：空行で分割
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    for para in paragraphs:
        if len(para) <= 500:
            if len(para) >= MIN_CHARS:
                chunks.append(para)
        elif len(para) <= 700:
            # 改行で分割
            lines = [l.strip() for l in para.split("\n") if l.strip()]
            current = ""
            for line in lines:
                if len(current) + len(line) > 500 and current:
                    if len(current) >= MIN_CHARS:
                        chunks.append(current)
                    current = line
                else:
                    current = current + "\n" + line if current else line
            if len(current) >= MIN_CHARS:
                chunks.append(current)
        else:
            # 句読点で分割
            import re
            sentences = re.split(r'(?<=。)', para)
            current = ""
            for sentence in sentences:
                if len(current) + len(sentence) > 700 and current:
                    if len(current) >= MIN_CHARS:
                        chunks.append(current)
                    current = sentence
                else:
                    current += sentence
            if len(current) >= MIN_CHARS:
                chunks.append(current)
    return chunks


def add_text(source: str, text: str, embed_model: FlagModel, separator: str = "@@@") -> dict:
    """手入力テキストをチャンキングしてDBに追加する"""
    chunks = chunk_text(text, separator)
    if not chunks:
        return {"success": False, "message": "チャンクが生成されませんでした"}

    existing_ids = set(collection.get()["ids"])
    prefix = source.replace(" ", "_")
    new_texts, new_ids, new_metadatas = [], [], []

    for i, chunk in enumerate(chunks):
        cid = f"{prefix}__テキスト__{i}"
        if cid not in existing_ids:
            new_texts.append(chunk)
            new_ids.append(cid)
            new_metadatas.append({"source": source, "heading": "テキスト"})

    if not new_texts:
        return {"success": False, "message": f"「{source}」は既に登録済みです"}

    embeddings = embed_model.encode(new_texts).tolist()
    collection.add(documents=new_texts, embeddings=embeddings, ids=new_ids, metadatas=new_metadatas)
    return {"success": True, "message": f"「{source}」を追加しました", "chunk_count": len(new_texts)}
