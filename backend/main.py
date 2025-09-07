import os
import logging
import uvicorn
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.models.user import User
from backend.models.org import Org
from backend.models.onboarding import OnboardingRequest
from backend.models.chat import ChatRequest, ChatResponse, AgentNotifyRequest, StatsResponse

from backend.auth import verify_firebase_token
from backend.services.files import process_file
from backend.services.gemini import ask_gemini
from backend.services.translation import translate_text
from backend.vectorstore import VectorStore
from backend.db.orgs import insert_org, get_org_by_id
from backend.db.users import insert_user

import faiss

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("backend")

faiss.omp_set_num_threads(1)
logger.info("FAISS threads set to 1")

# --- FastAPI App ---
app = FastAPI(title="AI Assistant Backend")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
logger.info("CORS middleware configured")


# --- AUTH ---
@app.get("/api/me", response_model=User)
async def get_me(user: User = Depends(verify_firebase_token)):
    logger.info(f"Fetching current user: {user.uid}")
    return user


# --- ONBOARDING ---
@app.post("/api/onboarding", response_model=Org)
async def onboarding(data: OnboardingRequest, user: User = Depends(verify_firebase_token)):
    logger.info(f"Starting onboarding for org: {data.orgName}")
    org_id = data.orgName.lower().replace(" ", "-")
    org = Org(
        id=org_id,
        name=data.orgName,
        email=data.email,
        vertical=data.vertical,
        integration=data.integration,
        languages=data.languages,
        filesMeta=data.filesMeta or [],
    )

    integration_code = None
    landing_url = None

    if data.integration == "widget":
        integration_code = f"""
        <script src="https://your-backend.com/static/widget.js"
                data-org="{org_id}"></script>
        """
        logger.info("Widget integration configured")

    elif data.integration == "landing":
        os.makedirs(f"static/landing/{org_id}", exist_ok=True)
        landing_path = f"static/landing/{org_id}/index.html"
        with open(landing_path, "w", encoding="utf-8") as f:
            f.write(f"""
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <title>{data.orgName} Assistant</title>
              </head>
              <body>
                <h2>Welcome to {data.orgName}'s AI Assistant</h2>
                <div id="chat-root"></div>
                <script src="https://your-backend.com/static/widget.js"
                        data-org="{org_id}"></script>
              </body>
            </html>
            """)
        landing_url = f"/static/landing/{org_id}/index.html"
        logger.info(f"Landing page created at {landing_url}")

    # Save org in DB
    org_dict = org.dict()
    if integration_code:
        org_dict["integration_code"] = integration_code
    if landing_url:
        org_dict["landing_url"] = landing_url

    await insert_org(org_dict)
    await insert_user(user.dict())
    logger.info(f"Onboarding completed for org: {org_id}")

    return org


# --- UPLOAD FILE ---
@app.post("/api/upload")
async def upload_file(orgId: str, file: UploadFile = File(...), user: User = Depends(verify_firebase_token)):
    file_path = f"uploads/{orgId}_{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(await file.read())
    logger.info(f"File uploaded: {file_path}")

    result = await process_file(orgId, file.filename, file_path)
    logger.info(f"File processed: {file.filename}, chunks: {result['chunks']}")
    return {"ok": True, "details": result}


# --- CHAT ---
@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, user: User = Depends(verify_firebase_token)):
    logger.info(f"Received chat request for org: {req.orgId}, user: {user.uid}")
    org = await get_org_by_id(req.orgId)
    if not org:
        logger.warning(f"Org not found: {req.orgId}")
        raise HTTPException(status_code=404, detail="Org not found")

    query = req.message
    if org["languages"] == "tamil":
        logger.info("Translating user query to English")
        query = await translate_text(query, "english")

    logger.info("Loading VectorStore")
    store = VectorStore()
    store.load(f"vectorstore_data/{req.orgId}.faiss")
    chunks = await store.search_with_meta(query, top_k=3)
    logger.info(f"Retrieved {len(chunks)} chunks from VectorStore")

    result = await ask_gemini(query, chunks)
    logger.info(f"Gemini response: {result['answer'][:50]}...")

    answer = result["answer"]
    if org["languages"] == "tamil":
        logger.info("Translating answer back to Tamil")
        answer = await translate_text(answer, "tamil")

    return ChatResponse(
        answer=answer,
        confidence=result["confidence"],
        sources=result["sources"],
    )


# --- AGENT NOTIFY ---
@app.post("/api/agentNotify")
async def agent_notify(req: AgentNotifyRequest, user: User = Depends(verify_firebase_token)):
    logger.info(f"Agent notify called for channel: {req.channel}")
    return {"ok": True, "status": "stubbed", "channel": req.channel}


# --- STATS ---
@app.get("/api/stats", response_model=StatsResponse)
async def stats(orgId: str, user: User = Depends(verify_firebase_token)):
    logger.info(f"Stats requested for org: {orgId}")
    return StatsResponse(
        messagesToday=42,
        avgLatencyMs=120,
        deflections=35,
        handoffs=7,
    )


# --- ROOT ---
@app.get("/")
def root():
    logger.info("Root endpoint hit")
    return {"message": "AI Assistant Backend running"}


