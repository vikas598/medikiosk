from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import kiosk, doctor, mobile

app = FastAPI(title="MediKiosk API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(kiosk.router)
app.include_router(doctor.router)
app.include_router(mobile.router)

@app.get("/health")
def health():
    return {"status": "ok"}
