import os
import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
import jwt

# -----------------------
# Firebase Admin init
# -----------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
cred_path = os.getenv("FIREBASE_CRED_PATH", os.path.join(BASE_DIR, "serviceAccountKey.json"))
cred = credentials.Certificate(cred_path)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# -----------------------
# FastAPI app
# -----------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------
# JWT settings
# -----------------------
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGO = "HS256"

# -----------------------
# Fake DB
# -----------------------
users_db = {}

# -----------------------
# Request models
# -----------------------
class GoogleAuthRequest(BaseModel):
    idToken: str
    role: Optional[str] = "user"

class PhoneAuthRequest(BaseModel):
    otp: str
    sessionInfo: str
    role: Optional[str] = "user"

# -----------------------
# JWT helper
# -----------------------
def create_session_token(user_id: str, role: str):
    payload = {
        "sub": user_id,
        "role": role,
        "iat": datetime.datetime.utcnow(),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def verify_firebase_token(token: str = Header(..., alias="Authorization")):
    """
    Verify JWT token passed in Authorization header as "Bearer <token>"
    """
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid JWT payload")
        return {"id": user_id, "role": role}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="JWT expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid JWT token")

# -----------------------
# Google Sign-In
# -----------------------
@app.post("/api/auth/google")
async def auth_google(req: GoogleAuthRequest):
    try:
        decoded_token = firebase_auth.verify_id_token(req.idToken)
        uid = decoded_token["uid"]
        email = decoded_token.get("email")
        name = decoded_token.get("name", "Google User")

        users_db[uid] = {"id": uid, "email": email, "name": name, "role": req.role}

        session_token = create_session_token(uid, req.role)
        return {"id": uid, "email": email, "name": name, "role": req.role, "token": session_token}

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Google auth failed: {str(e)}")

# -----------------------
# Phone Sign-In
# -----------------------
@app.post("/api/auth/phone")
async def auth_phone(req: PhoneAuthRequest):
    """
    Frontend sends OTP + sessionInfo (from Firebase reCAPTCHA)
    """
    try:
        # NOTE: For demo, assume uid = sessionInfo (replace with real verification)
        uid = req.sessionInfo
        name = "Phone User"

        users_db[uid] = {"id": uid, "name": name, "role": req.role}

        session_token = create_session_token(uid, req.role)
        return {"id": uid, "name": name, "role": req.role, "token": session_token}

    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Phone auth failed: {str(e)}")

# -----------------------
# Protected route example
# -----------------------
@app.get("/api/protected")
def protected(user=Depends(verify_firebase_token)):
    return {"msg": f"You are authorized!", "user": user}
