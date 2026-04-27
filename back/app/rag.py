import chromadb
from FlagEmbedding import FlagModel
from mlx_lm import load, generate
from pathlib import Path
from app.prompts import DRUG_SEARCH_PROMPT

EMBED_MODEL = "BAAI/bge-m3"
LLM_MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit"
CHROMA_PATH = str(Path.home() / "dev/rag_eval/chroma_db_drug")

print("[RAG] Embeddingモデルをロード中...")
embed_model = FlagModel(EMBED_MODEL, use_fp16=True)
print("[RAG] LLMをロード中...")
llm_model, tokenizer = load(LLM_MODEL)
print("[RAG] 準備完了")

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection("drug_rag")


def search(symptom: str, n_results: int = 5) -> dict:
    query_embedding = embed_model.encode([symptom]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n_results
    )

    retrieved_docs = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    sources = [
        {"source": meta["source"], "heading": meta["heading"], "distance": dist}
        for meta, dist in zip(metadatas, distances)
    ]

    context = "\n\n".join(
        [f"【{meta['source']}】\n{doc}" for doc, meta in zip(retrieved_docs, metadatas)]
    )

    prompt_text = DRUG_SEARCH_PROMPT.format(context=context, symptom=symptom)

    messages = [{"role": "user", "content": prompt_text}]
    prompt = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    response = generate(llm_model, tokenizer, prompt=prompt, max_tokens=600, verbose=False)

    return {
        "answer": response,
        "sources": sources
    }
