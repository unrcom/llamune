from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.core.auth import get_current_user
from app.core import llm

router = APIRouter(prefix="/validate", tags=["validate"])


class LoadRequest(BaseModel):
    model_name: str
    adapter_path: Optional[str] = None


class GenerateRequest(BaseModel):
    messages: list
    system_prompt: Optional[str] = None
    max_tokens: int = 512


class StatusResponse(BaseModel):
    loaded: bool
    model_name: Optional[str]
    adapter_path: Optional[str]


@router.get("/status", response_model=StatusResponse)
def get_status(_=Depends(get_current_user)):
    return StatusResponse(
        loaded=llm.is_model_loaded(),
        model_name=llm.get_current_model_name(),
        adapter_path=llm.get_current_adapter_path(),
    )


@router.post("/load")
def load_model(req: LoadRequest, _=Depends(get_current_user)):
    try:
        llm.load_model(req.model_name, req.adapter_path)
        return {"ok": True, "model_name": req.model_name, "adapter_path": req.adapter_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate")
def generate(req: GenerateRequest, _=Depends(get_current_user)):
    if not llm.is_model_loaded():
        raise HTTPException(status_code=400, detail="モデルがロードされていません")
    try:
        # 最後のuserメッセージを取得
        user_msg = next((m["content"] for m in reversed(req.messages) if m["role"] == "user"), "")
        result = llm.generate(user_msg, req.system_prompt, req.max_tokens)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
