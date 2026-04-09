from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.base import Poc, Model, SystemPrompt
from app.schemas.chat import ChatRequest, ChatResponse
from app.core.auth import get_current_user
from app.core import llm

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = None
    models_id = None
    if req.app_name:
        try:
            parts = req.app_name.split('-')
            poc_id = int(parts[0][1:])
            models_id = int(parts[1][1:])
            poc = db.query(Poc).filter(Poc.id == poc_id).first()
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid app_name format")
    elif req.poc_id:
        poc = db.query(Poc).filter(Poc.id == req.poc_id).first()

    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")

    if not models_id:
        if not poc.models_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PoC にモデルが設定されていません")
        models_id = poc.models_id

    model = db.query(Model).filter(Model.id == models_id).first()
    if not model:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Model not found")

    # システムプロンプト解決（スナップショット経由で渡された場合を優先）
    system_prompt_content = req.system_prompt
    if not system_prompt_content:
        if req.system_prompts_id:
            sp = db.query(SystemPrompt).filter(SystemPrompt.id == req.system_prompts_id).first()
            if sp:
                system_prompt_content = sp.content
        else:
            sp = db.query(SystemPrompt).filter(
                SystemPrompt.poc_id == poc.id,
                SystemPrompt.status == "active",
            ).order_by(SystemPrompt.id.desc()).first()
            if sp:
                system_prompt_content = sp.content

    # モデルロード
    if model.model_type == 'fine-tuned' and model.adapter_path and model.parent_models_id:
        parent = db.query(Model).filter(Model.id == model.parent_models_id).first()
        base_model_name = parent.name if parent else model.name
        adapter_path = model.adapter_path
    else:
        base_model_name = model.name
        adapter_path = None

    if (not llm.is_model_loaded()
            or llm.get_current_model_name() != base_model_name
            or llm.get_current_adapter_path() != adapter_path):
        try:
            llm.load_model(base_model_name, adapter_path=adapter_path)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"モデルのロードに失敗しました: {e}",
            )

    try:
        answer_text = llm.generate(
            prompt=req.question,
            system_prompt=system_prompt_content,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"推論に失敗しました: {e}",
        )

    return ChatResponse(answer=answer_text)
