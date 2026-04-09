import asyncio
import httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import (
    DISPLAY_NAME,
    INSTANCE_ID, INSTANCE_TYPE, MONKEY_URL,
    SELF_URL, INTERNAL_TOKEN, HEARTBEAT_INTERVAL,
)
from app.core.allowed_apps import get_allowed_apps
from app.api.routes import (
    auth, users, models, poc, system_prompts,
    questions, question_sets, question_set_executions,
    answers, jobs, learning_texts,
)


async def _register(client: httpx.AsyncClient) -> bool:
    try:
        allowed_apps = get_allowed_apps()
        res = await client.post(
            f"{MONKEY_URL}/api/registry/register",
            json={
                "instance_id": INSTANCE_ID,
                "url": SELF_URL,
                "display_name": DISPLAY_NAME,
                "instance_type": INSTANCE_TYPE,
                "allowed_apps": allowed_apps,
            },
            headers={"X-Internal-Token": INTERNAL_TOKEN},
            timeout=15.0,
        )
        print(f"✅ Registered to monkey: {INSTANCE_ID} (status={res.status_code}, allowed_apps={allowed_apps})")
        return True
    except Exception as e:
        print(f"⚠️  Failed to register to monkey: {type(e).__name__}: {e}")
        return False


async def _heartbeat_loop():
    await asyncio.sleep(HEARTBEAT_INTERVAL)
    async with httpx.AsyncClient() as client:
        while True:
            try:
                allowed_apps = get_allowed_apps()
                res = await client.put(
                    f"{MONKEY_URL}/api/registry/{INSTANCE_ID}/heartbeat",
                    json={"allowed_apps": allowed_apps},
                    headers={"X-Internal-Token": INTERNAL_TOKEN},
                    timeout=15.0,
                )
                if res.status_code == 404:
                    print(f"⚠️  Heartbeat 404 — re-registering: {INSTANCE_ID}")
                    await _register(client)
            except Exception as e:
                print(f"⚠️  Heartbeat failed: {type(e).__name__}: {e}")
            await asyncio.sleep(HEARTBEAT_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    heartbeat_task = None
    if MONKEY_URL:
        async with httpx.AsyncClient() as client:
            await _register(client)
        heartbeat_task = asyncio.create_task(_heartbeat_loop())

    yield

    if heartbeat_task:
        heartbeat_task.cancel()
    if MONKEY_URL:
        try:
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{MONKEY_URL}/api/registry/{INSTANCE_ID}",
                    headers={"X-Internal-Token": INTERNAL_TOKEN},
                    timeout=15.0,
                )
            print(f"🗑️  Unregistered from monkey: {INSTANCE_ID}")
        except Exception as e:
            print(f"⚠️  Failed to unregister from monkey: {type(e).__name__}: {e}")


app = FastAPI(title="llamune API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(models.router)
app.include_router(poc.router)
app.include_router(system_prompts.router)
app.include_router(questions.router)
app.include_router(question_sets.router)
app.include_router(question_set_executions.router)
app.include_router(answers.router)
app.include_router(jobs.router)
app.include_router(learning_texts.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
