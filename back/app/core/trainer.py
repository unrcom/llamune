import subprocess
import json
import tempfile
import shutil
import os
import re
from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.models.base import (
    TrainingJob, QuestionSetItemSnapshot, AnswerSnapshot,
    LearningTextChunkSnapshot,
)


def get_qa_training_data(db, job: TrainingJob) -> list[tuple[str, str]]:
    """Q&Aスナップショットから訓練データを取得"""
    items = db.query(QuestionSetItemSnapshot).filter(
        QuestionSetItemSnapshot.question_set_snapshots_id == job.question_set_snapshots_id
    ).order_by(QuestionSetItemSnapshot.order_index).all()

    rows = []
    for item in items:
        from app.models.base import QuestionSnapshot
        q_snapshot = db.query(QuestionSnapshot).filter(
            QuestionSnapshot.id == item.question_snapshots_id
        ).first()
        if not q_snapshot:
            continue
        answer_snapshot = db.query(AnswerSnapshot).filter(
            AnswerSnapshot.questions_id == q_snapshot.questions_id,
            AnswerSnapshot.answer_type == "human",
        ).first()
        if answer_snapshot:
            q_snapshot = db.query(QuestionSnapshot).filter(
                QuestionSnapshot.id == item.question_snapshots_id
            ).first()
            if q_snapshot:
                rows.append((q_snapshot.question, answer_snapshot.answer))
    return rows


def get_text_training_data(db, job: TrainingJob) -> list[str]:
    """テキストスナップショットからチャンクを取得"""
    chunks = db.query(LearningTextChunkSnapshot).filter(
        LearningTextChunkSnapshot.learning_text_snapshots_id == job.learning_text_snapshots_id
    ).order_by(LearningTextChunkSnapshot.chunk_index).all()
    return [chunk.content for chunk in chunks]


def write_qa_jsonl(path: str, rows: list[tuple[str, str]]) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        for question, answer in rows:
            record = {
                "messages": [
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": answer},
                ]
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def write_text_jsonl(path: str, chunks: list[str]) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        for chunk in chunks:
            record = {"text": chunk}
            f.write(json.dumps(record, ensure_ascii=False) + "\n")


def make_qa_data_dir(rows: list[tuple[str, str]], batch_size: int = 1) -> str:
    data_dir = tempfile.mkdtemp()
    write_qa_jsonl(os.path.join(data_dir, "train.jsonl"), rows)
    valid_rows = rows[:max(batch_size, 1)]
    write_qa_jsonl(os.path.join(data_dir, "valid.jsonl"), valid_rows)
    return data_dir


def make_text_data_dir(chunks: list[str], batch_size: int = 1) -> str:
    data_dir = tempfile.mkdtemp()
    write_text_jsonl(os.path.join(data_dir, "train.jsonl"), chunks)
    valid_chunks = chunks[:max(batch_size, 1)]
    write_text_jsonl(os.path.join(data_dir, "valid.jsonl"), valid_chunks)
    return data_dir


def get_adapter_path(job_id: int) -> str:
    path = os.path.expanduser(f"~/llmn_models/{job_id}")
    os.makedirs(path, exist_ok=True)
    return path


def get_model_path(db, models_id: int) -> tuple[str, str | None]:
    from app.models.base import Model
    model = db.query(Model).filter(Model.id == models_id).first()
    if not model:
        raise ValueError(f"Model not found: {models_id}")
    if model.model_type == 'fine-tuned' and model.parent_models_id:
        base_name, _ = get_model_path(db, model.parent_models_id)
        resume_adapter = os.path.join(model.adapter_path, "adapters.safetensors") if model.adapter_path else None
        return base_name, resume_adapter
    else:
        return model.name, None


def register_model(db, job: TrainingJob, job_id: int, adapter_path: str, trained_at: datetime) -> None:
    from app.models.base import Model
    name = f"llamune_job_{job_id}"
    display_name = job.output_model_name or name
    model = Model(
        name=name,
        display_name=display_name,
        model_type="fine-tuned",
        adapter_path=adapter_path,
        parent_models_id=job.models_id,
        trained_at=trained_at,
    )
    db.add(model)
    db.commit()


def build_cmd(job: TrainingJob, model_path: str, data_dir: str, batch_size: int,
              adapter_path: str, iters: int = 1, resume_adapter: str = None) -> list[str]:
    cmd = [
        "mlx_lm.lora",
        "--model", model_path,
        "--train",
        "--data", data_dir,
        "--adapter-path", adapter_path,
        "--iters", str(iters),
        "--batch-size", str(batch_size),
        "--learning-rate", str(job.learning_rate or 1e-5),
        "--num-layers", str(job.num_layers or 16),
        "--max-seq-length", str(job.max_seq_length or 2048),
        "--val-batches", "0",
    ]
    if resume_adapter:
        cmd += ["--resume-adapter-file", resume_adapter]
    return cmd


def run_lora_normal(job: TrainingJob, rows: list[tuple[str, str]], model_path: str,
                    adapter_path: str, log_path: str = None, resume_adapter: str = None) -> None:
    batch_size = min(job.batch_size or 4, len(rows))
    data_dir = make_qa_data_dir(rows, batch_size=batch_size)
    try:
        cmd = build_cmd(job, model_path, data_dir, batch_size=batch_size,
                        adapter_path=adapter_path, iters=job.iters or 100,
                        resume_adapter=resume_adapter)
        log_file = open(log_path, 'w', encoding='utf-8', buffering=1) if log_path else None
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in proc.stdout:
                line = line.rstrip()
                print(line)
                if log_file:
                    log_file.write(line + "\n")
                    log_file.flush()
            proc.wait()
            if proc.returncode != 0:
                raise RuntimeError(f"mlx_lm failed with returncode {proc.returncode}")
        finally:
            if log_file:
                log_file.close()
    finally:
        shutil.rmtree(data_dir, ignore_errors=True)


def run_lora_text(job: TrainingJob, chunks: list[str], model_path: str,
                  adapter_path: str, log_path: str = None, resume_adapter: str = None) -> None:
    batch_size = min(job.batch_size or 4, len(chunks))
    data_dir = make_text_data_dir(chunks, batch_size=batch_size)
    try:
        cmd = build_cmd(job, model_path, data_dir, batch_size=batch_size,
                        adapter_path=adapter_path, iters=job.iters or 100,
                        resume_adapter=resume_adapter)
        log_file = open(log_path, 'w', encoding='utf-8', buffering=1) if log_path else None
        try:
            proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
            for line in proc.stdout:
                line = line.rstrip()
                print(line)
                if log_file:
                    log_file.write(line + "\n")
                    log_file.flush()
            proc.wait()
            if proc.returncode != 0:
                raise RuntimeError(f"mlx_lm failed with returncode {proc.returncode}")
        finally:
            if log_file:
                log_file.close()
    finally:
        shutil.rmtree(data_dir, ignore_errors=True)


def run_lora_one_by_one(job: TrainingJob, rows: list[tuple[str, str]], model_path: str,
                        adapter_path: str, resume_adapter: str = None) -> None:
    loss_threshold = job.loss_threshold or 0.1
    max_trials = job.iters or 100
    loss_pattern = re.compile(r"Iter \d+: Train loss ([\d.]+)")
    current_adapter_file = resume_adapter
    pending = list(rows)

    while pending:
        next_pending = []
        for i, (question, answer) in enumerate(pending):
            graduated = False
            for trial in range(max_trials):
                data_dir = make_qa_data_dir([(question, answer)])
                try:
                    cmd = build_cmd(job, model_path, data_dir, batch_size=1,
                                    adapter_path=adapter_path, iters=1,
                                    resume_adapter=current_adapter_file)
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        raise RuntimeError(f"Item {i+1} trial {trial+1} failed")
                    current_adapter_file = os.path.join(adapter_path, "adapters.safetensors")
                    output = result.stdout + result.stderr
                    m = loss_pattern.search(output)
                    if m:
                        loss = float(m.group(1))
                        if loss < loss_threshold:
                            graduated = True
                            break
                finally:
                    shutil.rmtree(data_dir, ignore_errors=True)
            if not graduated:
                next_pending.append((question, answer))

        if not next_pending:
            break
        if len(next_pending) == len(pending):
            raise RuntimeError(
                f"{len(next_pending)} 件が loss_threshold {loss_threshold} に到達できませんでした"
            )
        pending = next_pending


def run_training(job_id: int):
    db = SessionLocal()
    try:
        db.execute(__import__('sqlalchemy').text("SET search_path TO llamune"))
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        base_model_path, resume_adapter_path = get_model_path(db, job.models_id)
        adapter_path = get_adapter_path(job_id)
        log_path = os.path.join(adapter_path, "training.log")

        if job.training_mode == 1:
            # テキスト学習モード
            chunks = get_text_training_data(db, job)
            if not chunks:
                raise ValueError("訓練データが見つかりません（テキストチャンクがありません）")
            run_lora_text(job, chunks, base_model_path, adapter_path,
                          log_path=log_path, resume_adapter=resume_adapter_path)

        elif job.training_mode == 2:
            # LoRAノーマルモード
            rows = get_qa_training_data(db, job)
            if not rows:
                raise ValueError("訓練データが見つかりません（human回答が登録されていません）")
            run_lora_normal(job, rows, base_model_path, adapter_path,
                            log_path=log_path, resume_adapter=resume_adapter_path)

        elif job.training_mode == 3:
            # llamuneオリジナルモード
            rows = get_qa_training_data(db, job)
            if not rows:
                raise ValueError("訓練データが見つかりません（human回答が登録されていません）")
            run_lora_one_by_one(job, rows, base_model_path, adapter_path,
                                resume_adapter=resume_adapter_path)

        trained_at = datetime.now(timezone.utc)
        job.status = "completed"
        job.finished_at = trained_at
        db.commit()

        register_model(db, job, job_id, adapter_path, trained_at)

    except Exception as e:
        job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.finished_at = datetime.now(timezone.utc)
            job.error_message = str(e)
            db.commit()
    finally:
        db.close()
