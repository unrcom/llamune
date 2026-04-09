from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
from app.db.database import get_db
from app.models.base import (
    Poc, QuestionSet, QuestionSetItem, Question, Answer, SystemPrompt,
    QuestionSetSnapshot, QuestionSetItemSnapshot, QuestionSnapshot,
    SystemPromptSnapshot, AnswerSnapshot, LearningText, LearningTextChunk,
    LearningTextSnapshot, LearningTextChunkSnapshot, TrainingJob,
)
from app.schemas.job import JobCreate, JobResponse
from app.core.auth import get_current_user
from app.core.config import DATABASE_URL
import os
import asyncio

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _create_qa_snapshot(qs: QuestionSet, db: Session) -> QuestionSetSnapshot:
    """Q&A学習用スナップショット一括作成"""
    sp_snapshot_id = None
    if qs.system_prompts_id:
        sp = db.query(SystemPrompt).filter(SystemPrompt.id == qs.system_prompts_id).first()
        if sp:
            sp_snapshot = SystemPromptSnapshot(
                system_prompts_id=sp.id,
                name=sp.name,
                content=sp.content,
            )
            db.add(sp_snapshot)
            db.flush()
            sp_snapshot_id = sp_snapshot.id

    qs_snapshot = QuestionSetSnapshot(
        question_sets_id=qs.id,
        system_prompt_snapshots_id=sp_snapshot_id,
        name=qs.name,
    )
    db.add(qs_snapshot)
    db.flush()

    items = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs.id
    ).order_by(QuestionSetItem.order_index).all()

    for item in items:
        q = db.query(Question).filter(Question.id == item.questions_id).first()
        if not q:
            continue
        q_snapshot = QuestionSnapshot(
            questions_id=q.id,
            question=q.question,
            training_role=q.training_role,
        )
        db.add(q_snapshot)
        db.flush()

        qsi_snapshot = QuestionSetItemSnapshot(
            question_set_snapshots_id=qs_snapshot.id,
            question_snapshots_id=q_snapshot.id,
            order_index=item.order_index,
        )
        db.add(qsi_snapshot)

        # human answer スナップショット
        human_answer = db.query(Answer).filter(
            Answer.questions_id == q.id,
            Answer.answer_type == "human",
            Answer.status == "active",
        ).first()
        if human_answer:
            a_snapshot = AnswerSnapshot(
                answers_id=human_answer.id,
                questions_id=q.id,
                answer=human_answer.answer,
                answer_type=human_answer.answer_type,
            )
            db.add(a_snapshot)

    qs.status = "active"
    db.flush()
    return qs_snapshot


def _create_text_snapshot(lt: LearningText, db: Session) -> LearningTextSnapshot:
    """テキスト学習用スナップショット一括作成"""
    lt_snapshot = LearningTextSnapshot(
        learning_texts_id=lt.id,
        title=lt.title,
        source_url=lt.source_url,
    )
    db.add(lt_snapshot)
    db.flush()

    chunks = db.query(LearningTextChunk).filter(
        LearningTextChunk.learning_texts_id == lt.id
    ).order_by(LearningTextChunk.chunk_index).all()

    for chunk in chunks:
        chunk_snapshot = LearningTextChunkSnapshot(
            learning_text_snapshots_id=lt_snapshot.id,
            learning_text_chunks_id=chunk.id,
            chunk_index=chunk.chunk_index,
            content=chunk.content,
            token_count=chunk.token_count,
        )
        db.add(chunk_snapshot)

    db.flush()
    return lt_snapshot


@router.get("", response_model=List[JobResponse])
def list_jobs(
    poc_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(TrainingJob)
    if poc_id:
        query = query.filter(TrainingJob.poc_id == poc_id)
    return query.order_by(TrainingJob.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("", status_code=202, response_model=JobResponse)
def create_job(
    req: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == req.poc_id).first()
    if not poc:
        raise HTTPException(status_code=404, detail="PoC not found")

    qs_snapshot_id = None
    lt_snapshot_id = None

    if req.training_mode == 1:
        # テキスト学習モード
        if not req.learning_text_snapshots_id:
            raise HTTPException(status_code=400, detail="テキスト学習モードでは learning_text_snapshots_id が必要です")
        lt_snapshot_id = req.learning_text_snapshots_id

    elif req.training_mode in (2, 3):
        # Q&A学習モード
        if not req.question_set_snapshots_id:
            # question_sets_id から新規スナップショット作成
            raise HTTPException(status_code=400, detail="Q&A学習モードでは question_set_snapshots_id が必要です")
        qs_snapshot_id = req.question_set_snapshots_id

    else:
        raise HTTPException(status_code=400, detail="training_mode は 1/2/3 のいずれかです")

    job = TrainingJob(
        poc_id=req.poc_id,
        models_id=req.models_id,
        question_set_snapshots_id=qs_snapshot_id,
        learning_text_snapshots_id=lt_snapshot_id,
        name=req.name,
        status="pending",
        training_mode=req.training_mode,
        iters=req.iters,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate,
        num_layers=req.num_layers,
        max_seq_length=req.max_seq_length,
        loss_threshold=req.loss_threshold,
        output_model_name=req.output_model_name,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    from app.core.trainer import run_training
    background_tasks.add_task(run_training, job.id)

    return job


@router.get("/{job_id}/log/stream")
async def stream_training_log(
    job_id: int,
    token: Optional[str] = None,
):
    from jose import JWTError, jwt
    from app.core.config import JWT_SECRET
    ALGORITHM = "HS256"
    if not token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    log_path = os.path.join(os.path.expanduser(f"~/llmn_models/{job_id}"), "training.log")

    async def event_generator():
        for _ in range(30):
            if os.path.exists(log_path):
                break
            await asyncio.sleep(1)
            yield f"data: waiting...\n\n"

        if not os.path.exists(log_path):
            yield f"data: [error] log file not found\n\n"
            return

        import psycopg2
        with open(log_path, 'r', encoding='utf-8') as f:
            for line in f:
                yield f"data: {line.rstrip()}\n\n"
            while True:
                line = f.readline()
                if line:
                    yield f"data: {line.rstrip()}\n\n"
                else:
                    conn = psycopg2.connect(DATABASE_URL)
                    try:
                        with conn.cursor() as cur:
                            cur.execute(
                                "SELECT status FROM llamune.training_jobs WHERE id = %s",
                                (job_id,)
                            )
                            row = cur.fetchone()
                            if row and row[0] in ('completed', 'failed'):
                                yield f"data: [done]\n\n"
                                return
                    finally:
                        conn.close()
                    await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
