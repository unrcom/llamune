from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from app.rag import search, embed_model
from app.auth import get_current_user
from app.dummy_data import get_facilities
from app.dataset import get_sources, delete_source, add_wikipedia, refresh_source, get_chunks, update_chunk, delete_chunk, add_text
from app.prompt_manager import get_prompts, add_prompt, update_prompt, delete_prompt, reorder_prompts

app = FastAPI(title="llamune API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SearchRequest(BaseModel):
    symptom: str
    prompt_order: int = 1

class WikipediaAddRequest(BaseModel):
    title: str

class TextAddRequest(BaseModel):
    source: str
    text: str
    separator: str = "@@@"

class ChunkUpdateRequest(BaseModel):
    text: str

class PromptAddRequest(BaseModel):
    name: str
    content: str

class PromptUpdateRequest(BaseModel):
    name: str
    content: str

class PromptReorderRequest(BaseModel):
    orders: List[dict]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/search")
def drug_search(
    req: SearchRequest,
    current_user: str = Depends(get_current_user)
):
    result = search(req.symptom, req.prompt_order)
    return {"user": current_user, "symptom": req.symptom, **result}


@app.get("/api/facilities")
def facilities(
    type: str = None,
    current_user: str = Depends(get_current_user)
):
    return get_facilities(type)


@app.get("/api/dataset/sources")
def dataset_sources(current_user: str = Depends(get_current_user)):
    return get_sources()


@app.get("/api/dataset/sources/{source}/chunks")
def dataset_chunks(source: str, current_user: str = Depends(get_current_user)):
    chunks = get_chunks(source)
    if not chunks:
        raise HTTPException(status_code=404, detail=f"ソース「{source}」が見つかりません")
    return chunks


@app.delete("/api/dataset/sources/{source}")
def dataset_delete(source: str, current_user: str = Depends(get_current_user)):
    deleted = delete_source(source)
    if deleted == 0:
        raise HTTPException(status_code=404, detail=f"ソース「{source}」が見つかりません")
    return {"success": True, "message": f"「{source}」を削除しました", "deleted_count": deleted}


@app.post("/api/dataset/sources/wikipedia")
def dataset_add_wikipedia(
    req: WikipediaAddRequest,
    current_user: str = Depends(get_current_user)
):
    result = add_wikipedia(req.title, embed_model)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/dataset/sources/text")
def dataset_add_text(
    req: TextAddRequest,
    current_user: str = Depends(get_current_user)
):
    result = add_text(req.source, req.text, embed_model, req.separator)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/dataset/sources/refresh/{source}")
def dataset_refresh(source: str, current_user: str = Depends(get_current_user)):
    result = refresh_source(source, embed_model)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.put("/api/dataset/chunks/{chunk_id:path}")
def chunk_update(
    chunk_id: str,
    req: ChunkUpdateRequest,
    current_user: str = Depends(get_current_user)
):
    result = update_chunk(chunk_id, req.text, embed_model)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@app.delete("/api/dataset/chunks/{chunk_id:path}")
def chunk_delete(chunk_id: str, current_user: str = Depends(get_current_user)):
    result = delete_chunk(chunk_id)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@app.get("/api/prompts")
def prompts_list(current_user: str = Depends(get_current_user)):
    return get_prompts()


@app.post("/api/prompts")
def prompt_add(
    req: PromptAddRequest,
    current_user: str = Depends(get_current_user)
):
    result = add_prompt(req.name, req.content)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.put("/api/prompts/{file:path}")
def prompt_update(
    file: str,
    req: PromptUpdateRequest,
    current_user: str = Depends(get_current_user)
):
    result = update_prompt(file, req.name, req.content)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result


@app.delete("/api/prompts/{file:path}")
def prompt_delete(
    file: str,
    current_user: str = Depends(get_current_user)
):
    result = delete_prompt(file)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@app.post("/api/prompts/reorder")
def prompt_reorder(
    req: PromptReorderRequest,
    current_user: str = Depends(get_current_user)
):
    result = reorder_prompts(req.orders)
    return result
