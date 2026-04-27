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
