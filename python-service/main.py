import threading
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from api.enroll_router import router as enroll_router
import session_runner

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start session runner polling di background thread saat server naik
    t = threading.Thread(target=session_runner.run, daemon=True)
    t.start()
    yield
    # Cleanup: stop semua kamera aktif
    for info in list(session_runner.active_sessions.values()):
        info["stop"].set()


app = FastAPI(title="Absensi Face Recognition Service", lifespan=lifespan)

app.include_router(enroll_router, prefix="/enroll", tags=["enrollment"])


@app.get("/")
def health():
    return {"status": "ok"}


@app.get("/session/status")
def session_status():
    return {"active_ruangan": list(session_runner.active_sessions.keys())}
