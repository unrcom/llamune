import chromadb
import wikipediaapi
import json
from FlagEmbedding import FlagModel

EMBED_MODEL = "BAAI/bge-m3"
CHUNK_MAX_CHARS = 500
MIN_CHARS = 50

def split_by_paragraph(text: str, max_chars: int = CHUNK_MAX_CHARS):
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) <= max_chars:
            current += ("\n" if current else "") + para
        else:
            if current:
                chunks.append(current)
            current = para
    if current:
        chunks.append(current)
    return chunks

def collect_chunks(sections, parent_title=""):
    chunks = []
    for section in sections:
        heading = f"{parent_title} > {section.title}" if parent_title else section.title
        if len(section.text.strip()) >= MIN_CHARS:
            for i, chunk in enumerate(split_by_paragraph(section.text)):
                chunks.append({"heading": heading, "text": chunk})
        if section.sections:
            chunks.extend(collect_chunks(section.sections, heading))
    return chunks

def fetch_chunks(title: str, category: str):
    wiki = wikipediaapi.Wikipedia(language="ja", user_agent="rag-eval/1.0")
    page = wiki.page(title)
    if not page.exists():
        return []
    all_chunks = []
    for chunk in split_by_paragraph(page.summary):
        all_chunks.append({"heading": "概要", "text": chunk})
    all_chunks.extend(collect_chunks(page.sections))
    return all_chunks

print("=== 薬効RAG構築 ===\n")

print("Embeddingモデルをロード中...")
embed_model = FlagModel(EMBED_MODEL, use_fp16=True)
print("完了\n")

client = chromadb.PersistentClient(path="./chroma_db_drug")
collection = client.get_or_create_collection("drug_rag")

with open("drug_wiki_pages.json") as f:
    pages = json.load(f)

total = 0
for category, titles in pages.items():
    for title in titles:
        print(f"投入中: [{category}] {title}")
        chunks = fetch_chunks(title, category)
        if not chunks:
            print(f"  スキップ（記事なし）")
            continue

        existing = set(collection.get()["ids"])
        prefix = title.replace(" ", "_")

        new_chunks = []
        new_ids = []
        new_metadatas = []
        for i, chunk in enumerate(chunks):
            cid = f"{prefix}__{chunk['heading']}__{i}"
            if cid not in existing:
                new_chunks.append(chunk["text"])
                new_ids.append(cid)
                new_metadatas.append({
                    "source": title,
                    "category": category,
                    "heading": chunk["heading"],
                })

        if not new_chunks:
            print(f"  既に投入済み")
            continue

        embeddings = embed_model.encode(new_chunks).tolist()
        collection.add(
            documents=new_chunks,
            embeddings=embeddings,
            ids=new_ids,
            metadatas=new_metadatas,
        )
        print(f"  {len(new_chunks)}チャンク投入完了")
        total += len(new_chunks)

print(f"\n全投入完了: 合計{total}チャンク")
print(f"DB総チャンク数: {collection.count()}")
