import httpx
import json
import os
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.db.database import get_db
from app.models.base import (
    Poc, QuestionSet, QuestionSetItem, Question, SystemPrompt, Answer,
    QuestionSetSnapshot, QuestionSetItemSnapshot, QuestionSnapshot,
    SystemPromptSnapshot, QuestionSetExecution, QuestionSetExecutionResult,
)
from app.schemas.execution import ExecutionResponse, ExecutionResultResponse
from app.core.auth import get_current_user
from app.core.config import MONKEY_URL, DATABASE_URL

router = APIRouter(prefix="/poc/{poc_id}/question_sets/{qs_id}/executions", tags=["executions"])


class ExecutionCreateRequest(BaseModel):
    models_id: Optional[int] = None


def _build_response(exe: QuestionSetExecution, db: Session) -> ExecutionResponse:
    results = db.query(QuestionSetExecutionResult).filter(
        QuestionSetExecutionResult.question_set_executions_id == exe.id
    ).all()
    result_responses = []
    for r in results:
        q_snapshot = db.query(QuestionSnapshot).filter(QuestionSnapshot.id == r.question_snapshots_id).first()
        answer = db.query(Answer).filter(Answer.id == r.answers_id).first() if r.answers_id else None
        result_responses.append(ExecutionResultResponse(
            id=r.id,
            question_set_executions_id=r.question_set_executions_id,
            question_snapshots_id=r.question_snapshots_id,
            answers_id=r.answers_id,
            status=r.status,
            error_message=r.error_message,
            question_text=q_snapshot.question if q_snapshot else None,
            answer_text=answer.answer if answer else None,
        ))
    return ExecutionResponse(
        id=exe.id,
        question_set_snapshots_id=exe.question_set_snapshots_id,
        models_id=exe.models_id,
        status=exe.status,
        executed_at=exe.executed_at,
        finished_at=exe.finished_at,
        results=result_responses,
    )


def _create_snapshot(qs: QuestionSet, db: Session) -> QuestionSetSnapshot:
    # system_prompt スナップショット
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

    # question_set スナップショット
    qs_snapshot = QuestionSetSnapshot(
        question_sets_id=qs.id,
        system_prompt_snapshots_id=sp_snapshot_id,
        name=qs.name,
    )
    db.add(qs_snapshot)
    db.flush()

    # question_set_items スナップショット
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

    # question_set を active にロック
    qs.status = "active"

    db.flush()
    return qs_snapshot


def _run_execution(exe_id: int, database_url: str, app_name: str, monkey_url: str, token: str):
    import psycopg2
    from datetime import datetime

    conn = psycopg2.connect(database_url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        cur.execute(
            "UPDATE llamune.question_set_executions SET status = 2 WHERE id = %s",
            (exe_id,)
        )
        conn.commit()

        cur.execute("""
            SELECT qse.question_set_snapshots_id, qse.models_id, qss.system_prompt_snapshots_id
            FROM llamune.question_set_executions qse
            JOIN llamune.question_set_snapshots qss ON qss.id = qse.question_set_snapshots_id
            WHERE qse.id = %s
        """, (exe_id,))
        row = cur.fetchone()
        if not row:
            return
        qs_snapshot_id, models_id, sp_snapshot_id = row

        # system_prompt content 取得
        system_prompt_content = None
        if sp_snapshot_id:
            cur.execute(
                "SELECT content FROM llamune.system_prompt_snapshots WHERE id = %s",
                (sp_snapshot_id,)
            )
            sp_row = cur.fetchone()
            if sp_row:
                system_prompt_content = sp_row[0]

        cur.execute("""
            SELECT qsis.question_snapshots_id, qs.question
            FROM llamune.question_set_item_snapshots qsis
            JOIN llamune.question_snapshots qs ON qs.id = qsis.question_snapshots_id
            WHERE qsis.question_set_snapshots_id = %s
            ORDER BY qsis.order_index
        """, (qs_snapshot_id,))
        items = cur.fetchall()

        for question_snapshots_id, question_text in items:
            cur.execute("""
                UPDATE llamune.question_set_execution_results
                SET status = 2
                WHERE question_set_executions_id = %s AND question_snapshots_id = %s
            """, (exe_id, question_snapshots_id))
            conn.commit()

            try:
                with httpx.Client(timeout=300.0) as client:
                    chunks = []
                    with client.stream(
                        "POST",
                        f"{monkey_url}/api/chat",
                        json={
                            "app_name": app_name,
                            "question": question_text,
                            "system_prompt": system_prompt_content,
                        },
                        headers={"Authorization": f"Bearer {token}"},
                    ) as res:
                        res.raise_for_status()
                        for chunk in res.iter_bytes():
                            chunks.append(chunk)

                raw = b"".join(chunks).decode("utf-8")
                data = json.loads(raw)

                if not data.get("routable", True):
                    reason = data.get("reason", "no_matching_app")
                    error_msg = f"ルーティング失敗: {reason}"
                    cur.execute("""
                        UPDATE llamune.question_set_execution_results
                        SET status = 4, error_message = %s
                        WHERE question_set_executions_id = %s AND question_snapshots_id = %s
                    """, (error_msg, exe_id, question_snapshots_id))
                    conn.commit()
                    continue

                answer_text = data.get("answer", "")

                # questions_id を question_snapshot から取得
                cur.execute(
                    "SELECT questions_id FROM llamune.question_snapshots WHERE id = %s",
                    (question_snapshots_id,)
                )
                q_row = cur.fetchone()
                questions_id = q_row[0] if q_row else None

                cur.execute("""
                    INSERT INTO llamune.answers (questions_id, models_id, answer, answer_type, status)
                    VALUES (%s, %s, %s, 'llm', 'active')
                    RETURNING id
                """, (questions_id, models_id, answer_text))
                answers_id = cur.fetchone()[0]
                conn.commit()

                cur.execute("""
                    UPDATE llamune.question_set_execution_results
                    SET status = 3, answers_id = %s
                    WHERE question_set_executions_id = %s AND question_snapshots_id = %s
                """, (answers_id, exe_id, question_snapshots_id))
                conn.commit()

            except Exception as e:
                print(f"❌ Question execution error: {e}")
                cur.execute("""
                    UPDATE llamune.question_set_execution_results
                    SET status = 4, error_message = %s
                    WHERE question_set_executions_id = %s AND question_snapshots_id = %s
                """, (str(e), exe_id, question_snapshots_id))
                conn.commit()

        cur.execute("""
            UPDATE llamune.question_set_executions
            SET status = 3, finished_at = %s
            WHERE id = %s
        """, (datetime.utcnow(), exe_id))
        conn.commit()

    except Exception as e:
        print(f"❌ Execution error: {e}")
        cur.execute(
            "UPDATE llamune.question_set_executions SET status = 4 WHERE id = %s",
            (exe_id,)
        )
        conn.commit()
    finally:
        conn.close()


@router.get("", response_model=List[ExecutionResponse])
def get_executions(
    poc_id: int,
    qs_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    qs_snapshot_ids = db.query(QuestionSetSnapshot.id).filter(
        QuestionSetSnapshot.question_sets_id == qs_id
    ).subquery()
    exes = db.query(QuestionSetExecution).filter(
        QuestionSetExecution.question_set_snapshots_id.in_(qs_snapshot_ids)
    ).order_by(QuestionSetExecution.id.desc()).all()
    return [_build_response(e, db) for e in exes]


@router.post("", response_model=ExecutionResponse, status_code=status.HTTP_202_ACCEPTED)
def create_execution(
    poc_id: int,
    qs_id: int,
    req: ExecutionCreateRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    poc = db.query(Poc).filter(Poc.id == poc_id).first()
    if not poc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PoC not found")

    models_id = req.models_id or poc.models_id
    if not models_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="モデルが指定されていません")

    qs = db.query(QuestionSet).filter(
        QuestionSet.id == qs_id,
        QuestionSet.poc_id == poc_id,
    ).first()
    if not qs:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QuestionSet not found")

    items = db.query(QuestionSetItem).filter(
        QuestionSetItem.question_sets_id == qs_id
    ).all()
    if not items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="質問セットに質問がありません")

    app_name = f"p{poc_id}-m{models_id}"
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

    # スナップショット作成
    qs_snapshot = _create_snapshot(qs, db)

    exe = QuestionSetExecution(
        question_set_snapshots_id=qs_snapshot.id,
        models_id=models_id,
        status=1,
    )
    db.add(exe)
    db.flush()

    # 結果レコードを question_snapshot ベースで作成
    item_snapshots = db.query(QuestionSetItemSnapshot).filter(
        QuestionSetItemSnapshot.question_set_snapshots_id == qs_snapshot.id
    ).all()
    for item_snapshot in item_snapshots:
        result = QuestionSetExecutionResult(
            question_set_executions_id=exe.id,
            question_snapshots_id=item_snapshot.question_snapshots_id,
            status=1,
        )
        db.add(result)

    db.commit()
    db.refresh(exe)

    background_tasks.add_task(
        _run_execution, exe.id, DATABASE_URL, app_name, MONKEY_URL, token
    )

    return _build_response(exe, db)
