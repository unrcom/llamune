from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.rag import search
from app.auth import get_current_user
from app.dummy_data import get_facilities

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
