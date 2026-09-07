from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import kiosk, doctor, mobile, reception
from app.services.tts import load_tts_client


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_tts_client()
    yield


app = FastAPI(title="MediKiosk API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kiosk.router)
app.include_router(kiosk.tts_router)
app.include_router(doctor.router)
app.include_router(mobile.router)
app.include_router(reception.router)

@app.get("/health")
def health():
    return {"status": "ok"}
