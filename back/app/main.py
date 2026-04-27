from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.rag import search, embed_model
from app.auth import get_current_user
from app.dummy_data import get_facilities
from app.dataset import get_sources, delete_source, add_wikipedia, refresh_source

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


class WikipediaAddRequest(BaseModel):
    title: str


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/search")
def drug_search(
    req: SearchRequest,
    current_user: str = Depends(get_current_user)
):
    result = search(req.symptom)
    return {
        "user": current_user,
        "symptom": req.symptom,
        **result
    }


@app.get("/api/facilities")
def facilities(
    type: str = None,
    current_user: str = Depends(get_current_user)
):
    return get_facilities(type)


@app.get("/api/dataset/sources")
def dataset_sources(current_user: str = Depends(get_current_user)):
    return get_sources()


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


@app.post("/api/dataset/sources/refresh/{source}")
def dataset_refresh(source: str, current_user: str = Depends(get_current_user)):
    result = refresh_source(source, embed_model)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
