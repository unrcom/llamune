from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth, models, projects, question_sets, ft_conversations

app = FastAPI(title="llmn API", version="1.0.0")

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


@app.get("/health")
def health_check():
    return {"status": "ok"}
