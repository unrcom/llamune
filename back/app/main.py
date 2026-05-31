from contextlib import asynccontextmanager
import logging
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, models, projects, question_sets, ft_conversations, training_jobs, validate, datasets, system_prompts


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB接続チェック
    from sqlalchemy import text
    from app.db.database import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logging.info("DB connection: OK")
    except Exception as e:
        logging.critical(f"DB接続に失敗しました。起動を中止します: {e}")
        sys.exit(1)
    yield


app = FastAPI(title="llmn API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(models.router)
app.include_router(projects.router)
app.include_router(question_sets.router)
app.include_router(ft_conversations.router)
app.include_router(training_jobs.router)
app.include_router(validate.router)
app.include_router(datasets.router)
app.include_router(system_prompts.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


from fastapi.responses import FileResponse
import os

static_dir = os.path.join(os.path.dirname(__file__), "../../web/dist")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    index = os.path.join(static_dir, "index.html")
    file_path = os.path.realpath(os.path.join(static_dir, full_path))
    if file_path.startswith(os.path.realpath(static_dir)) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(index)
