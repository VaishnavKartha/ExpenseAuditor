from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import client
from routes.auth import router as auth_router
from routes.claims import router as claims_router
from routes.policies import router as policies_router
from routes.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify MongoDB connection on startup
    await client.admin.command("ping")
    print("✅ Connected to MongoDB")
    yield
    client.close()


app = FastAPI(
    title="ExpenseAuditor API",
    description="AI-powered expense claim auditing system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router)
app.include_router(claims_router)
app.include_router(policies_router)
app.include_router(notifications_router)


@app.get("/", tags=["Health"])
async def health_check():
    return {"status": "ok", "service": "ExpenseAuditor API"}