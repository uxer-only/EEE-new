from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Depends, UploadFile, File, Form
from fastapi.responses import JSONResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import math
import random
import time
import ipaddress
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt
import httpx
import asyncio
import resend
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
REPORT_RECIPIENT = os.environ.get('REPORT_EMAIL', 'info@eliteescortseurope.eu')
IPGEOLOCATION_API_KEY = os.environ.get('IPGEOLOCATION_API_KEY')
APP_URL = os.environ.get('APP_URL', '').rstrip('/')
PRODUCT_NAME = "Elite Escorts Europe"
GRACE_DAYS = 3
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Uploaded photos / videos are stored on disk (set UPLOAD_DIR to a persistent volume in production)
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', str(ROOT_DIR / 'uploads')))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB per file (shown in the upload box)
MEDIA_TYPES = {
    'image/jpeg': ('photo', '.jpg'), 'image/png': ('photo', '.png'), 'image/webp': ('photo', '.webp'),
    'video/mp4': ('video', '.mp4'), 'video/quicktime': ('video', '.mov'),
}

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== MODELS =====

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str  # provider, client, admin
    account_type: Optional[str] = None  # independent | agency (providers only)
    email_verified: bool = False
    created_at: datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # provider or client
    account_type: Optional[str] = "independent"  # independent | agency

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class SessionExchange(BaseModel):
    session_id: str

class ProviderProfile(BaseModel):
    provider_id: str
    user_id: str
    display_name: str
    account_type: Optional[str] = "independent"  # independent | agency
    availability_type: Optional[str] = "both"    # incall | outcall | both
    booking_advance: Optional[bool] = False
    available247: Optional[bool] = False
    worldwide_travel: Optional[bool] = False  # shown on the profile as "Available for worldwide travel"
    age: Optional[int] = None
    gender: Optional[str] = None  # female, male, trans
    location: Dict[str, Any]  # {city, country, lat, lng}
    bio: Optional[str] = None
    essence: Optional[str] = None
    companionshipType: Optional[str] = None
    services: Any = []  # List[str] OR Dict[str, {type, price}]
    rates: Dict[str, Any] = {}  # {"1hour": 150, "2hours": 280, ...}
    contact: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    photos: List[str] = []
    characteristics: Optional[Dict[str, Any]] = None
    verified: bool = False
    verification_status: str = "pending"  # pending, approved, rejected
    available: bool = True
    accepts_disabilities: Optional[bool] = False
    created_at: datetime

class ProviderProfileCreate(BaseModel):
    display_name: str
    account_type: Optional[str] = "independent"
    availability_type: Optional[str] = "both"
    booking_advance: Optional[bool] = False
    available247: Optional[bool] = False
    worldwide_travel: Optional[bool] = False
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Dict[str, Any]
    bio: Optional[str] = None
    essence: Optional[str] = None
    companionshipType: Optional[str] = None
    services: Any = []
    rates: Dict[str, Any] = {}
    contact: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    photos: List[str] = []
    characteristics: Optional[Dict[str, Any]] = None
    accepts_disabilities: Optional[bool] = False

class ProviderProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    account_type: Optional[str] = None
    availability_type: Optional[str] = None
    booking_advance: Optional[bool] = None
    available247: Optional[bool] = None
    worldwide_travel: Optional[bool] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    bio: Optional[str] = None
    essence: Optional[str] = None
    companionshipType: Optional[str] = None
    services: Optional[Any] = None
    rates: Optional[Dict[str, Any]] = None
    contact: Optional[Dict[str, Any]] = None
    schedule: Optional[Dict[str, Any]] = None
    photos: Optional[List[str]] = None
    characteristics: Optional[Dict[str, Any]] = None
    available: Optional[bool] = None
    accepts_disabilities: Optional[bool] = None

class Message(BaseModel):
    message_id: str
    conversation_id: str
    sender_id: str
    content: str
    timestamp: datetime
    read: bool = False

class MessageCreate(BaseModel):
    conversation_id: str
    content: str

class Conversation(BaseModel):
    conversation_id: str
    client_id: str
    provider_id: str
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    created_at: datetime

class VerificationDocument(BaseModel):
    doc_id: str
    provider_id: str
    document_type: str
    document_url: str
    status: str  # pending, approved, rejected
    submitted_at: datetime
    reviewed_at: Optional[datetime] = None

class VerificationSubmit(BaseModel):
    id_front: str  # base64 data URL or hosted URL
    id_selfie: str  # selfie holding the ID
    secondary_doc: Optional[str] = None  # passport / driver's license, optional

class VerificationDecision(BaseModel):
    status: str  # "approved" or "rejected"
    reason: Optional[str] = None

class MediaItem(BaseModel):
    media_id: str
    provider_id: str
    url: str
    media_type: str  # photo, video
    status: str  # pending, approved, rejected
    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None

class MediaApproval(BaseModel):
    status: str  # approved, rejected
    reason: Optional[str] = None

class TrafficLog(BaseModel):
    log_id: str
    page: str
    user_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

# ===== AUTH HELPERS =====

async def get_current_user(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    """Get current user from cookie or Authorization header"""
    token = session_token
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)


async def _resolve_owned_profile(current_user: "User", provider_id: Optional[str] = None, projection=None):
    """Resolve a provider profile owned by current_user.
    If provider_id is given (e.g. an agency selecting one of its profiles), the profile
    must belong to the current user. Otherwise return the user's single profile
    (backward compatible for independent providers)."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    query = {"user_id": current_user.user_id}
    if provider_id:
        query["provider_id"] = provider_id
    return await db.provider_profiles.find_one(query, projection)

# ===== AUTH ROUTES =====

@api_router.post("/auth/register")
async def register(user_data: UserRegister, request: Request):
    """Register new user with email/password"""
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt())
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "picture": None,
        "role": user_data.role,
        "account_type": user_data.account_type if user_data.role == "provider" else None,
        "password_hash": hashed_password.decode(),
        "email_verified": False,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)

    # Send email verification link (manual sign-ups only)
    origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
    if not origin:
        origin = APP_URL or str(request.base_url).rstrip("/")
    await _send_verification_email(user_doc, origin)
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    
    # Return user without password and created_at
    user_response = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "picture": None,
        "role": user_data.role,
        "account_type": user_doc["account_type"],
        "email_verified": False
    }
    
    response = JSONResponse(content=user_response)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return response

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": credentials.email})
    
    if not user_doc or "password_hash" not in user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.checkpw(credentials.password.encode(), user_doc["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    session_doc = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    
    # Return user without password and created_at
    user_response = {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "picture": user_doc.get("picture"),
        "role": user_doc["role"],
        "account_type": user_doc.get("account_type"),
        "email_verified": user_doc.get("email_verified", True)
    }
    
    response = JSONResponse(content=user_response)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return response

@api_router.post("/auth/session")
async def exchange_session(session_data: SessionExchange):
    """Exchange Emergent session_id for user data and session_token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_data.session_id}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session_id")
        
        auth_data = response.json()
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": auth_data["email"]})
    
    if user_doc:
        # Update existing user
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data["picture"]
            }}
        )
        user_id = user_doc["user_id"]
    else:
        # Create new user with client role by default
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data["picture"],
            "role": "client",  # Default role for OAuth
            "email_verified": True,  # Google/Emergent OAuth already verifies the email
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_doc)
    
    # Create session with emergent session_token
    session_doc = {
        "user_id": user_id,
        "session_token": auth_data["session_token"],
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.user_sessions.insert_one(session_doc)
    
    # Return user data
    user_response = await db.users.find_one(
        {"user_id": user_id},
        {"_id": 0, "password_hash": 0}
    )
    
    response = JSONResponse(content=user_response)
    response.set_cookie(
        key="session_token",
        value=auth_data["session_token"],
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return response

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return current_user

@api_router.post("/auth/logout")
async def logout(response: Response, session_token: Optional[str] = Cookie(None)):
    """Logout user"""
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ===== PASSWORD RESET =====

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

def _reset_email_html(display_name: str, reset_url: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0C;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#141416;border:1px solid #27272A;">
        <tr><td style="padding:40px 40px 24px 40px;text-align:center;">
          <h1 style="margin:0;color:#C6A87C;font-size:28px;font-weight:normal;letter-spacing:2px;">Lumi&egrave;re</h1>
        </td></tr>
        <tr><td style="padding:0 40px 24px 40px;">
          <h2 style="margin:0 0 16px 0;color:#F2F0ED;font-size:22px;font-weight:normal;">Reset your password</h2>
          <p style="margin:0 0 16px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">Hi {display_name},</p>
          <p style="margin:0 0 24px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">
            We received a request to reset your Lumi&egrave;re password. Tap the button below to choose a new one. This link expires in 24 hours.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
            <tr><td style="background-color:#C6A87C;">
              <a href="{reset_url}" style="display:inline-block;padding:14px 36px;color:#0A0A0C;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Reset Password</a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0 0;color:#71717A;font-size:13px;line-height:1.6;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="{reset_url}" style="color:#C6A87C;word-break:break-all;">{reset_url}</a>
          </p>
          <p style="margin:24px 0 0 0;color:#71717A;font-size:13px;line-height:1.6;">
            If you didn't request this, you can safely ignore this email &mdash; your password won't change.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #27272A;text-align:center;">
          <p style="margin:0;color:#52525B;font-size:12px;">Lumi&egrave;re &middot; Discreet. Curated. Exceptional.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

@api_router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest, request: Request):
    """Send password reset email. Neutral response to prevent email enumeration."""
    neutral = {"message": "If an account exists for that email, we've sent a reset link."}
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if user and user.get("password_hash"):
        await db.password_reset_tokens.delete_many({"user_id": user["user_id"]})
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["user_id"],
            "email": email,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.now(timezone.utc)
        })
        origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
        if not origin:
            origin = str(request.base_url).rstrip("/")
        reset_url = f"{origin}/reset-password?token={token}"
        if RESEND_API_KEY:
            try:
                await asyncio.to_thread(
                    resend.Emails.send,
                    {
                        "from": f"Lumi\u00e8re <{SENDER_EMAIL}>",
                        "to": [email],
                        "subject": "Reset your Lumi\u00e8re password",
                        "html": _reset_email_html(user.get("name") or "there", reset_url),
                    },
                )
            except Exception as e:
                logger.error(f"Resend send failed for {email}: {e}")
        else:
            logger.warning("RESEND_API_KEY not configured; reset link: %s", reset_url)
    return neutral

@api_router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """Validate token and set a new password."""
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    record = await db.password_reset_tokens.find_one({"token": payload.token}, {"_id": 0})
    if not record or record.get("used"):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has already been used.")
    expires_at = record.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This reset link has expired. Please request a new one.")
    new_hash = bcrypt.hashpw(payload.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": record["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    await db.password_reset_tokens.update_one(
        {"token": payload.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}}
    )
    await db.user_sessions.delete_many({"user_id": record["user_id"]})
    return {"message": "Password updated successfully. Please login with your new password."}


def _verification_email_html(first_name: str, confirm_url: str) -> str:
    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:0 auto; color:#1a1a1a; line-height:1.6;">
      <p>Hi {first_name},</p>
      <p>Thank you for signing up for {PRODUCT_NAME}! We're glad to have you on board.</p>
      <p>To finish setting up your account, please confirm that this is your email address:</p>
      <p style="text-align:center; margin:32px 0;">
        <a href="{confirm_url}" style="background:#832161; color:#ffffff; text-decoration:none; padding:14px 32px; border-radius:6px; font-weight:bold; display:inline-block;">Confirm my email</a>
      </p>
      <p style="color:#898989; font-size:13px;">This link expires in 24hrs. If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="{confirm_url}" style="color:#832161; word-break:break-all;">{confirm_url}</a>
      </p>
      <p>Your inbox stays yours. We only use your email address for things related to your account, like sign-in, security alerts, and important service updates. We never use it to send marketing emails, and we never share it with third parties.</p>
      <p>Didn't create an account? You can safely ignore this email. No account will be activated without confirmation.</p>
      <p>Thanks again,<br>Anouchka from {PRODUCT_NAME}</p>
    </div>
    """


async def _send_verification_email(user_doc: dict, origin: str):
    """Generate a 24h verification token and email a confirmation link. No-op if already verified."""
    if user_doc.get("email_verified"):
        return
    await db.email_verification_tokens.delete_many({"user_id": user_doc["user_id"]})
    token = secrets.token_urlsafe(32)
    await db.email_verification_tokens.insert_one({
        "token": token,
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        "used": False,
        "created_at": datetime.now(timezone.utc),
    })
    origin = (origin or APP_URL or "").rstrip("/")
    confirm_url = f"{origin}/verify-email?token={token}"
    first_name = (user_doc.get("name") or "there").split(" ")[0]
    if RESEND_API_KEY:
        try:
            await asyncio.to_thread(
                resend.Emails.send,
                {
                    "from": f"Anouchka from {PRODUCT_NAME} <{SENDER_EMAIL}>",
                    "to": [user_doc["email"]],
                    "subject": f"Confirm your email for {PRODUCT_NAME}",
                    "html": _verification_email_html(first_name, confirm_url),
                },
            )
        except Exception as e:
            logger.error(f"Verification email failed for {user_doc['email']}: {e}")
    else:
        logger.warning("RESEND_API_KEY not configured; verification link: %s", confirm_url)


@api_router.get("/auth/verify-email")
async def verify_email(token: str):
    """Confirm a user's email from the link in the verification email. Idempotent: a used token
    whose account is already verified still returns success (handles link prefetch / double-clicks)."""
    record = await db.email_verification_tokens.find_one({"token": token}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=400, detail="This confirmation link is invalid.")
    user = await db.users.find_one({"user_id": record["user_id"]}, {"_id": 0, "email_verified": 1})
    if record.get("used"):
        if user and user.get("email_verified"):
            return {"message": "Your email has been confirmed. Welcome to Elite Escorts Europe!"}
        raise HTTPException(status_code=400, detail="This confirmation link has already been used.")
    expires_at = record.get("expires_at")
    if isinstance(expires_at, datetime):
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="This confirmation link has expired. Please request a new one.")
    await db.users.update_one({"user_id": record["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_verification_tokens.update_one(
        {"token": token}, {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Your email has been confirmed. Welcome to Elite Escorts Europe!"}


@api_router.post("/auth/resend-verification")
async def resend_verification(request: Request, current_user: User = Depends(get_current_user)):
    """Re-send the verification email to the logged-in user."""
    if current_user.email_verified:
        return {"message": "Your email is already verified."}
    user_doc = await db.users.find_one({"user_id": current_user.user_id})
    origin = request.headers.get("origin") or request.headers.get("referer", "").rstrip("/")
    if not origin:
        origin = APP_URL or str(request.base_url).rstrip("/")
    await _send_verification_email(user_doc, origin)
    return {"message": "We've sent you a new confirmation email. Please check your inbox."}



# ===== PROVIDER ROUTES =====

def _normalize_rates(rates: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert rate values to floats. Supports both legacy flat shape
    ({'1hour': 150, ...}) and new nested shape ({'incall': {...}, 'outcall': {...}}).
    Skip empty values. Preserves the 'extras' list ([{hours, price}])."""
    if not rates:
        return {}
    # Nested incall/outcall shape
    if isinstance(rates, dict) and ('incall' in rates or 'outcall' in rates):
        out: Dict[str, Any] = {}
        for kind in ('incall', 'outcall'):
            col = rates.get(kind)
            if not isinstance(col, dict):
                continue
            col_out: Dict[str, Any] = {}
            for k, v in col.items():
                if k == 'extras':
                    extras_out = []
                    for item in (v or []):
                        if not isinstance(item, dict):
                            continue
                        try:
                            h = int(item.get('hours'))
                            p = float(item.get('price'))
                            extras_out.append({'hours': h, 'price': p})
                        except (TypeError, ValueError):
                            continue
                    if extras_out:
                        col_out['extras'] = extras_out
                    continue
                if v is None or v == '':
                    continue
                try:
                    col_out[k] = float(v)
                except (TypeError, ValueError):
                    continue
            if col_out:
                out[kind] = col_out
        cur = rates.get('currency')
        if isinstance(cur, str) and re.fullmatch(r'[A-Z]{3}', cur):
            out['currency'] = cur
        return out
    # Legacy flat shape
    out_flat: Dict[str, Any] = {}
    for k, v in rates.items():
        if v is None or v == "":
            continue
        try:
            out_flat[k] = float(v)
        except (TypeError, ValueError):
            continue
    return out_flat

def _distance_zone(km) -> int:
    """Distance zone for browse ordering: 0 (<=10 km) … 4 (>100 km), 5 when unknown."""
    if km is None:
        return 5
    for zone, limit in enumerate((10, 25, 50, 100)):
        if km <= limit:
            return zone
    return 4


def _numeric_range_cond(field_path: str, min_val, max_val) -> dict:
    """$expr range condition that safely handles values stored as numbers or
    numeric strings. Missing, empty or non-numeric values never match
    ($and short-circuits on the type check, and $convert never throws)."""
    num = {"$convert": {"input": f"${field_path}", "to": "double", "onError": None, "onNull": None}}
    conds = [{"$eq": [{"$type": num}, "double"]}]
    if min_val is not None:
        conds.append({"$gte": [num, float(min_val)]})
    if max_val is not None:
        conds.append({"$lte": [num, float(max_val)]})
    return {"$expr": {"$and": conds}}


def _add_numeric_range_expr(query: dict, field_path: str, min_val, max_val):
    """Add a numeric range filter on one field (see _numeric_range_cond)."""
    if min_val is None and max_val is None:
        return
    query.setdefault("$and", []).append(_numeric_range_cond(field_path, min_val, max_val))


# ===== SUBSCRIPTIONS / PAYMENTS =====
# Server-side allowlist — never trust client for amounts.
PLANS = {
    "featured_2w": {"label": "Featured · 2 weeks", "amount": 30.00, "duration_days": 14, "kind": "featured"},
    "featured_4w": {"label": "Featured · 4 weeks", "amount": 55.00, "duration_days": 28, "kind": "featured"},
    "vip_2w":      {"label": "VIP · 2 weeks", "amount": 15.00, "duration_days": 14, "kind": "vip"},
    "vip_4w":      {"label": "VIP · 4 weeks", "amount": 25.00, "duration_days": 28, "kind": "vip"},
    # Independent advertiser plans (per profile)
    "featured_7d":  {"label": "Featured · 7 days",   "amount": 30.00,  "duration_days": 7,  "kind": "featured"},
    "featured_15d": {"label": "Featured · 15 days",  "amount": 50.00,  "duration_days": 15, "kind": "featured"},
    "featured_1m":  {"label": "Featured · 1 month",  "amount": 90.00,  "duration_days": 30, "kind": "featured"},
    "featured_3m":  {"label": "Featured · 3 months", "amount": 240.00, "duration_days": 90, "kind": "featured"},
    "vip_7d":  {"label": "VIP · 7 days",   "amount": 10.00, "duration_days": 7,  "kind": "vip"},
    "vip_15d": {"label": "VIP · 15 days",  "amount": 15.00, "duration_days": 15, "kind": "vip"},
    "vip_1m":  {"label": "VIP · 1 month",  "amount": 25.00, "duration_days": 30, "kind": "vip"},
    "vip_3m":  {"label": "VIP · 3 months", "amount": 60.00, "duration_days": 90, "kind": "vip"},
    # Agency per-profile pricing (€30 / 2wk, €50 / 4wk)
    "agency_featured_2w": {"label": "Featured · 2 weeks", "amount": 30.00, "duration_days": 14, "kind": "featured"},
    "agency_featured_4w": {"label": "Featured · 4 weeks", "amount": 50.00, "duration_days": 28, "kind": "featured"},
}
CURRENCY = "eur"

# Agency graded plans. The per-profile price depends on the agency's ACTIVE profiles at checkout:
# profiles that are live now plus the profiles being paid for in this checkout (each counted once).
#   t0 = 1–2 active profiles (standard price, same as independents)
#   t1 = 3–6 active profiles (agency price)
#   t2 = 7+ active profiles (volume price)
AGENCY_PLANS = {
    "agency_7d":  {"label": "7 days",   "duration_days": 7,  "kind": "featured", "price": {"t0": 30.00, "t1": 25.00, "t2": 20.00}},
    "agency_15d": {"label": "15 days",  "duration_days": 15, "kind": "featured", "price": {"t0": 50.00, "t1": 45.00, "t2": 35.00}},
    "agency_1m":  {"label": "1 month",  "duration_days": 30, "kind": "featured", "price": {"t0": 90.00, "t1": 80.00, "t2": 65.00}},
    "agency_3m":  {"label": "3 months", "duration_days": 90, "kind": "featured", "price": {"t0": 240.00, "t1": 220.00, "t2": 180.00}},
    "agency_vip_7d":  {"label": "VIP · 7 days",   "duration_days": 7,  "kind": "vip", "price": {"t0": 10.00, "t1": 10.00, "t2": 8.00}},
    "agency_vip_15d": {"label": "VIP · 15 days",  "duration_days": 15, "kind": "vip", "price": {"t0": 15.00, "t1": 15.00, "t2": 12.00}},
    "agency_vip_1m":  {"label": "VIP · 1 month",  "duration_days": 30, "kind": "vip", "price": {"t0": 25.00, "t1": 25.00, "t2": 20.00}},
    "agency_vip_3m":  {"label": "VIP · 3 months", "duration_days": 90, "kind": "vip", "price": {"t0": 60.00, "t1": 60.00, "t2": 48.00}},
}
AGENCY_TIER_MIN = 3         # 3+ active profiles → agency price (t1)
AGENCY_TIER_THRESHOLD = 7   # 7+ active profiles → volume price (t2)


def _agency_tier(active_count: int) -> str:
    """Grade for an agency with `active_count` active profiles (live now + paid in this checkout)."""
    if active_count >= AGENCY_TIER_THRESHOLD:
        return "t2"
    if active_count >= AGENCY_TIER_MIN:
        return "t1"
    return "t0"


def _agency_amount(plan_key: str, tier: str) -> float:
    p = AGENCY_PLANS.get(plan_key or "")
    if not p:
        return 0.0
    return float(p["price"].get(tier, p["price"]["t1"]))


def _stripe_checkout(http_request: "Request"):
    """Lazy-build a StripeCheckout instance pinned to this request's host."""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe is not configured")
    host_url = str(http_request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    return StripeCheckout(api_key=api_key, webhook_url=webhook_url)


class CheckoutBody(BaseModel):
    featured_plan: str           # e.g. "featured_2w" — required
    vip_plan: Optional[str] = None  # e.g. "vip_4w" — optional add-on
    auto_renew: bool = True      # provider's preference; stored for future Stripe Billing migration
    origin_url: str              # frontend window.location.origin
    provider_id: Optional[str] = None  # agency: which profile to activate


@api_router.post("/subscriptions/checkout")
async def create_subscription_checkout(
    body: CheckoutBody,
    http_request: Request,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe checkout session for Featured (+ optional VIP) plan.
    Server computes amount; never trust client."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Only providers can purchase plans")

    profile = await _resolve_owned_profile(current_user, body.provider_id)
    if not profile:
        raise HTTPException(status_code=400, detail="Create your profile before purchasing a plan")

    # Validate plans
    if body.featured_plan not in PLANS or PLANS[body.featured_plan]["kind"] != "featured":
        raise HTTPException(status_code=400, detail="Invalid featured plan")
    if body.vip_plan is not None:
        if body.vip_plan not in PLANS or PLANS[body.vip_plan]["kind"] != "vip":
            raise HTTPException(status_code=400, detail="Invalid VIP plan")

    featured = PLANS[body.featured_plan]
    vip = PLANS[body.vip_plan] if body.vip_plan else None
    total_amount = round(featured["amount"] + (vip["amount"] if vip else 0.0), 2)

    metadata = {
        "user_id": current_user.user_id,
        "provider_id": profile["provider_id"],
        "featured_plan": body.featured_plan,
        "vip_plan": body.vip_plan or "",
        "auto_renew": "1" if body.auto_renew else "0",
        "kind": "subscription_purchase",
    }

    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/dashboard"

    from emergentintegrations.payments.stripe.checkout import CheckoutSessionRequest
    stripe = _stripe_checkout(http_request)
    req = CheckoutSessionRequest(
        amount=total_amount,
        currency=CURRENCY,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)

    # Mandatory: store transaction as pending
    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": current_user.user_id,
        "provider_id": profile["provider_id"],
        "amount": total_amount,
        "currency": CURRENCY,
        "featured_plan": body.featured_plan,
        "vip_plan": body.vip_plan,
        "auto_renew": body.auto_renew,
        "metadata": metadata,
        "payment_status": "pending",
        "status": "open",
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "url": session.url,
        "session_id": session.session_id,
        "amount": total_amount,
        "currency": CURRENCY,
    }


def _grace_state(featured_until, now: datetime) -> Dict[str, Any]:
    """Lapsed listings stay visible for GRACE_DAYS with a renew prompt."""
    if not featured_until or featured_until > now:
        return {"in_grace": False, "grace_days_left": 0}
    grace_end = featured_until + timedelta(days=GRACE_DAYS)
    if grace_end <= now:
        return {"in_grace": False, "grace_days_left": 0}
    return {"in_grace": True, "grace_days_left": max(0, round((grace_end - now).total_seconds() / 86400, 2))}


def _days_left_dt(dt, now: datetime) -> float:
    if not dt:
        return 0
    return max(0, round((dt - now).total_seconds() / 86400, 2))


def _rates_set(rates) -> bool:
    if not isinstance(rates, dict):
        return bool(rates)
    def _col(c):
        if not isinstance(c, dict):
            return bool(c)
        if any(c.get(k) for k in ("1hour", "2hours", "3hours", "overnight")):
            return True
        ex = c.get("extras")
        return isinstance(ex, list) and any((e or {}).get("price") for e in ex)
    if "incall" in rates or "outcall" in rates:
        return _col(rates.get("incall")) or _col(rates.get("outcall"))
    return _col(rates)


def _avail_set(p) -> bool:
    if p.get("available247"):
        return True
    sched = p.get("schedule") or {}
    if isinstance(sched, dict) and isinstance(sched.get("schedule"), dict):
        sched = sched["schedule"]
    if isinstance(sched, dict):
        return any(isinstance(d, dict) and (d.get("available") or d.get("start")) for d in sched.values())
    return False


def _profile_completion(p):
    """Returns (completed_steps, total_steps, plan_selectable) for a provider profile."""
    loc = p.get("location") or {}
    basic = bool(p.get("display_name") and p.get("age") and loc.get("city") and (p.get("bio") or p.get("essence")))
    services = bool(p.get("services"))
    rates = _rates_set(p.get("rates"))
    avail = _avail_set(p)
    photos = bool(p.get("photos"))
    done = sum([basic, services, rates, avail, photos])
    selectable = basic and services and rates
    return done, 5, selectable


def _renewal_email_html(display_name: str, grace_end: datetime, renew_url: str) -> str:
    when = grace_end.strftime("%d %B %Y")
    return f"""
    <div style="font-family:Georgia,serif; max-width:560px; margin:0 auto; padding:32px; background:#FFFFFF; color:#000000;">
      <h1 style="font-size:22px; color:#832161; margin:0 0 16px;">Elite Escorts Europe</h1>
      <h2 style="font-size:18px; font-weight:normal; margin:0 0 16px;">Your listing is due for renewal</h2>
      <p style="line-height:1.6;">Hi {display_name},</p>
      <p style="line-height:1.6;">Your Featured listing has expired. It will stay visible on Browse until <strong>{when}</strong>
        ({GRACE_DAYS}-day grace period), after which it will be hidden from clients.</p>
      <p style="margin:24px 0 12px;">
        <a href="{renew_url}" style="display:inline-block; background:#DA4167; color:#FFFFFF; padding:12px 20px; text-decoration:none; font-weight:bold; letter-spacing:1px; text-transform:uppercase; font-size:13px;">Renew now</a>
      </p>
      <p style="color:#898989; font-size:12px; margin-top:32px;">Renewing during the grace period keeps your profile online without interruption.</p>
    </div>
    """


async def send_renewal_notices():
    """Email owners of listings that lapsed into the grace period (once per lapse)."""
    now = datetime.utcnow()
    cursor = db.provider_profiles.find(
        {"featured_until": {"$lte": now, "$gt": now - timedelta(days=GRACE_DAYS)}},
        {"_id": 0, "provider_id": 1, "user_id": 1, "display_name": 1, "featured_until": 1, "renewal_notice_for": 1},
    )
    sent = 0
    async for p in cursor:
        if p.get("renewal_notice_for") == p["featured_until"]:
            continue
        user = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0, "email": 1, "name": 1})
        if not user or not user.get("email"):
            continue
        renew_url = f"{APP_URL}/subscribe?provider_id={p['provider_id']}"
        grace_end = p["featured_until"] + timedelta(days=GRACE_DAYS)
        if RESEND_API_KEY:
            try:
                await asyncio.to_thread(resend.Emails.send, {
                    "from": f"Elite Escorts Europe <{SENDER_EMAIL}>",
                    "to": [user["email"]],
                    "subject": f"{p.get('display_name') or 'Your profile'} is due for renewal",
                    "html": _renewal_email_html(p.get("display_name") or user.get("name") or "there", grace_end, renew_url),
                })
            except Exception as e:
                logger.error(f"Renewal email failed for {user['email']}: {e}")
                continue
        else:
            logger.warning("RESEND_API_KEY not configured; renewal link for %s: %s", user["email"], renew_url)
        await db.provider_profiles.update_one(
            {"provider_id": p["provider_id"]},
            {"$set": {"renewal_notice_for": p["featured_until"], "renewal_notice_sent_at": datetime.now(timezone.utc)}},
        )
        sent += 1
    return sent


async def _renewal_notice_loop():
    while True:
        try:
            n = await send_renewal_notices()
            if n:
                logger.info(f"Sent {n} renewal notice(s)")
        except Exception as e:
            logger.error(f"Renewal notice loop error: {e}")
        await asyncio.sleep(6 * 3600)


async def _apply_plan_to_profile(provider_id: str, featured_plan: Optional[str], vip_plan: Optional[str], now: datetime):
    """Apply Featured (+ optional VIP) duration to a single provider profile (additive top-up)."""
    profile = await db.provider_profiles.find_one({"provider_id": provider_id})
    if not profile:
        return
    set_fields: Dict[str, Any] = {}
    feat = PLANS.get(featured_plan or "") or AGENCY_PLANS.get(featured_plan or "")
    if feat:
        current = profile.get("featured_until")
        base = current if (current and current > now) else now
        set_fields["featured_until"] = base + timedelta(days=feat["duration_days"])
        set_fields["active_featured_plan"] = featured_plan
    if vip_plan:
        vp = PLANS.get(vip_plan) or AGENCY_PLANS.get(vip_plan)
        if vp:
            current = profile.get("vip_until")
            base = current if (current and current > now) else now
            set_fields["vip_until"] = base + timedelta(days=vp["duration_days"])
            set_fields["active_vip_plan"] = vip_plan
    # Clear the pending plan now that it is paid
    set_fields["pending_plan"] = None
    await db.provider_profiles.update_one({"provider_id": provider_id}, {"$set": set_fields})


async def _activate_subscription_for_session(session_id: str) -> Optional[dict]:
    """Idempotent: read the pending tx, apply Featured + VIP duration to the target profile(s).
    Handles both single-profile and agency bulk (provider_plans list) transactions.
    Returns the updated tx or None if already processed / not found."""
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        return None
    if tx.get("status") == "complete":
        return tx  # already processed — short-circuit
    if tx.get("payment_status") != "paid":
        return tx  # not paid yet

    now = datetime.utcnow()  # naive UTC for comparisons against Mongo dates

    provider_plans = tx.get("provider_plans")
    if provider_plans:
        # Agency bulk: activate every profile in the batch
        for pp in provider_plans:
            await _apply_plan_to_profile(
                pp.get("provider_id"), pp.get("featured_plan"), pp.get("vip_plan"), now
            )
    else:
        await _apply_plan_to_profile(
            tx.get("provider_id"), tx.get("featured_plan"), tx.get("vip_plan"), now
        )

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {"status": "complete", "completed_at": now}},
    )
    return await db.payment_transactions.find_one({"session_id": session_id})


@api_router.get("/subscriptions/status/{session_id}")
async def subscription_status(
    session_id: str,
    http_request: Request,
    current_user: User = Depends(get_current_user),
):
    """Poll Stripe → update tx → activate plan (idempotent)."""
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Session not found")
    if tx["user_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    if tx.get("status") != "complete":
        stripe = _stripe_checkout(http_request)
        cs = await stripe.get_checkout_status(session_id)
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": cs.payment_status,
                "stripe_status": cs.status,
                "amount_total": cs.amount_total,
                "stripe_currency": cs.currency,
            }},
        )
        if cs.payment_status == "paid":
            await _activate_subscription_for_session(session_id)

    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    profiles = []
    if tx.get("provider_plans"):
        ids = [pp.get("provider_id") for pp in tx["provider_plans"]]
        names = {
            d["provider_id"]: d for d in await db.provider_profiles.find(
                {"provider_id": {"$in": ids}}, {"_id": 0, "provider_id": 1, "display_name": 1}
            ).to_list(200)
        }
        for pp in tx["provider_plans"]:
            pid = pp.get("provider_id")
            profiles.append({
                "provider_id": pid,
                "name": (names.get(pid) or {}).get("display_name") or "Companion",
                "featured_plan": pp.get("featured_plan"),
                "vip_plan": pp.get("vip_plan"),
            })
    return {
        "session_id": session_id,
        "profiles": profiles,
        "payment_status": tx.get("payment_status"),
        "status": tx.get("status"),
        "amount": tx.get("amount"),
        "currency": tx.get("currency"),
        "featured_plan": tx.get("featured_plan"),
        "vip_plan": tx.get("vip_plan"),
    }


@api_router.get("/subscriptions/me")
async def my_subscription(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Returns the provider's current plan state + days remaining."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    profile = await _resolve_owned_profile(
        current_user, provider_id,
        {"_id": 0, "featured_until": 1, "vip_until": 1, "provider_id": 1},
    )
    if not profile:
        return {"has_profile": False}
    now = datetime.utcnow()  # Mongo returns naive UTC datetimes

    def _days_left(dt):
        if not dt:
            return 0
        diff = (dt - now).total_seconds() / 86400
        return max(0, round(diff, 2))

    featured_until = profile.get("featured_until")
    vip_until = profile.get("vip_until")

    # Latest completed subscription (for auto_renew flag)
    latest_sub = await db.subscriptions.find_one(
        {"provider_id": profile["provider_id"]},
        sort=[("created_at", -1)],
    )
    auto_renew_pref = bool(latest_sub.get("auto_renew", True)) if latest_sub else True
    grace = _grace_state(featured_until, now)

    return {
        "has_profile": True,
        "featured_active": bool(featured_until and featured_until > now),
        "featured_until": featured_until.isoformat() if featured_until else None,
        "featured_days_left": _days_left(featured_until),
        "in_grace": grace["in_grace"],
        "grace_days_left": grace["grace_days_left"],
        "vip_active": bool(vip_until and vip_until > now),
        "vip_until": vip_until.isoformat() if vip_until else None,
        "vip_days_left": _days_left(vip_until),
        "auto_renew": auto_renew_pref,
        "plans": PLANS,
    }


class AutoRenewUpdate(BaseModel):
    auto_renew: bool


@api_router.put("/subscriptions/auto-renew")
async def update_auto_renew(
    body: AutoRenewUpdate,
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Toggle auto_renew on the provider's latest subscription."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    profile = await _resolve_owned_profile(
        current_user, provider_id, {"_id": 0, "provider_id": 1},
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    latest_sub = await db.subscriptions.find_one(
        {"provider_id": profile["provider_id"]},
        sort=[("created_at", -1)],
    )
    if latest_sub:
        await db.subscriptions.update_one(
            {"_id": latest_sub["_id"]},
            {"$set": {"auto_renew": body.auto_renew}},
        )
    else:
        # Providers whose plan was granted outside the Stripe flow (seed/admin) have no
        # subscriptions row yet — upsert one so the preference persists.
        await db.subscriptions.update_one(
            {"provider_id": profile["provider_id"]},
            {
                "$set": {"auto_renew": body.auto_renew, "provider_id": profile["provider_id"]},
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
    return {"auto_renew": body.auto_renew}


# --------------------------------------------------------------------- Enquiries

class EnquiryCreate(BaseModel):
    provider_id: str
    name: str
    email: str
    message: str


@api_router.post("/enquiries")
async def create_enquiry(body: EnquiryCreate):
    """Public: save a message sent from the 'Do you have extra requests?' form."""
    if not body.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    provider = await db.provider_profiles.find_one(
        {"provider_id": body.provider_id},
        {"_id": 0, "user_id": 1, "display_name": 1},
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Load the provider's account to get their email
    provider_user = await db.users.find_one(
        {"user_id": provider["user_id"]},
        {"_id": 0, "email": 1, "name": 1},
    )

    doc = {
        "enquiry_id": f"enq_{uuid.uuid4().hex[:12]}",
        "provider_id": body.provider_id,
        "user_id_provider": provider["user_id"],
        "name": body.name.strip()[:100],
        "email": body.email.strip()[:120],
        "message": body.message.strip()[:1500],
        "read": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.enquiries.insert_one(doc)

    # Notify the provider via email (reply-to set to the client so they can reply directly)
    if RESEND_API_KEY and provider_user and provider_user.get("email"):
        provider_email = provider_user["email"]
        provider_name = provider_user.get("name") or provider.get("display_name") or "there"
        subject = f"New enquiry from {doc['name'] or 'a visitor'}"
        html = f"""
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color:#000000;">
          <h2 style="color:#832161; margin:0 0 12px;">Elite Escorts Europe</h2>
          <p style="color:#DA4167; font-size:12px; letter-spacing:2px; text-transform:uppercase; margin:0 0 24px;">New enquiry</p>
          <p>Hi {provider_name},</p>
          <p>You have received a new message via your public profile.</p>
          <table style="width:100%; border-collapse:collapse; margin:16px 0;">
            <tr>
              <td style="padding:8px 0; color:#898989; width:120px;">From</td>
              <td style="padding:8px 0;"><strong>{doc['name'] or 'Anonymous'}</strong></td>
            </tr>
            <tr>
              <td style="padding:8px 0; color:#898989;">Reply to</td>
              <td style="padding:8px 0;"><a href="mailto:{doc['email']}" style="color:#DA4167; text-decoration:none;">{doc['email']}</a></td>
            </tr>
          </table>
          <div style="background:#F0EFF4; border-left:3px solid #DA4167; padding:16px; margin:16px 0; white-space:pre-wrap;">
            {doc['message']}
          </div>
          <p style="margin:24px 0 12px;">
            <a href="mailto:{doc['email']}?subject=Re: your enquiry on Elite Escorts Europe"
               style="display:inline-block; background:#DA4167; color:#FFFFFF; padding:12px 20px; text-decoration:none; font-weight:bold; letter-spacing:1px; text-transform:uppercase; font-size:13px;">
              Reply to {doc['name'] or 'sender'}
            </a>
          </p>
          <p style="color:#898989; font-size:12px; margin-top:32px;">
            Tip: just hit <em>Reply</em> on this email — your reply will go straight to the sender.<br/>
            You can also see this message on your <a href="#" style="color:#832161;">Elite Escorts Europe dashboard</a>.
          </p>
        </div>
        """
        try:
            payload = {
                "from": f"Elite Escorts Europe <{SENDER_EMAIL}>",
                "to": [provider_email],
                "subject": subject,
                "html": html,
            }
            # Set reply-to so provider can respond directly from their inbox
            if doc["email"]:
                payload["reply_to"] = [doc["email"]]
            await asyncio.to_thread(resend.Emails.send, payload)
        except Exception as e:
            logger.error(f"Enquiry notification email failed for {provider_email}: {e}")

    return {"ok": True, "enquiry_id": doc["enquiry_id"]}


class ReportCreate(BaseModel):
    provider_id: str
    reporter_name: str
    reporter_email: str
    description: str
    images: List[str] = []  # base64 data URLs


def _report_email_html(doc: dict) -> str:
    imgs = len(doc.get("images") or [])
    return f"""
    <div style="font-family:Arial,Helvetica,sans-serif; max-width:600px; margin:0 auto; color:#1a1a1a;">
      <h2 style="color:#832161;">Profile reported as fake</h2>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:6px 0; color:#898989;">Profile</td><td style="padding:6px 0; font-weight:bold;">{doc.get('provider_name') or doc['provider_id']}</td></tr>
        <tr><td style="padding:6px 0; color:#898989;">Reported by</td><td style="padding:6px 0;">{doc['reporter_name']} &lt;{doc['reporter_email']}&gt;</td></tr>
        <tr><td style="padding:6px 0; color:#898989;">Attachments</td><td style="padding:6px 0;">{imgs} image(s)</td></tr>
      </table>
      <div style="background:#F0EFF4; border-left:3px solid #DA4167; padding:16px; margin:16px 0; white-space:pre-wrap;">{doc['description']}</div>
      <p style="color:#898989; font-size:12px; margin-top:24px;">Report ID: {doc['report_id']} — reply to this email to reach the reporter.</p>
    </div>
    """


@api_router.post("/reports")
async def create_report(body: ReportCreate):
    """Public: report a profile as fake. Stored for admin review and emailed to the site admin."""
    if not body.reporter_name.strip():
        raise HTTPException(status_code=400, detail="Your name is required")
    if not body.reporter_email.strip() or not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", body.reporter_email):
        raise HTTPException(status_code=400, detail="A valid email is required")
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="A description is required")

    provider = await db.provider_profiles.find_one(
        {"provider_id": body.provider_id}, {"_id": 0, "display_name": 1}
    )
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    images = [img for img in (body.images or []) if img][:5]
    doc = {
        "report_id": f"rep_{uuid.uuid4().hex[:12]}",
        "provider_id": body.provider_id,
        "provider_name": provider.get("display_name"),
        "reporter_name": body.reporter_name.strip(),
        "reporter_email": body.reporter_email.strip(),
        "description": body.description.strip()[:500],
        "images": images,
        "status": "open",
        "created_at": datetime.now(timezone.utc),
    }
    await db.reports.insert_one(doc)

    if RESEND_API_KEY:
        attachments = []
        for i, img in enumerate(images):
            content = img.split(",", 1)[1] if "," in img else img
            ext = "jpg" if img.startswith("data:image/jpeg") else ("webp" if img.startswith("data:image/webp") else "png")
            attachments.append({"filename": f"evidence_{i + 1}.{ext}", "content": content})
        try:
            payload = {
                "from": f"Elite Escorts Europe <{SENDER_EMAIL}>",
                "to": [REPORT_RECIPIENT],
                "subject": f"Profile report: {doc['provider_name'] or doc['provider_id']}",
                "html": _report_email_html(doc),
                "reply_to": [doc["reporter_email"]],
            }
            if attachments:
                payload["attachments"] = attachments
            await asyncio.to_thread(resend.Emails.send, payload)
        except Exception as e:
            logger.error(f"Report email failed: {e}")

    return {"ok": True, "report_id": doc["report_id"]}


@api_router.get("/enquiries/mine")
async def list_my_enquiries(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    query = {"user_id_provider": current_user.user_id}
    if provider_id:
        # separate inbox per profile — validate ownership
        owned = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1})
        if not owned:
            raise HTTPException(status_code=404, detail="Profile not found")
        query["provider_id"] = provider_id
    cursor = db.enquiries.find(
        query,
        {"_id": 0},
    ).sort("created_at", -1).limit(200)
    items = []
    async for row in cursor:
        ts = row.get("created_at")
        if isinstance(ts, datetime):
            # Mongo returns naive UTC datetimes: mark them as UTC so browsers show local time correctly
            row["created_at"] = (ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)).isoformat()
        items.append(row)
    pids = list({e.get("provider_id") for e in items if e.get("provider_id")})
    if pids:
        names = {
            d["provider_id"]: d.get("display_name") for d in await db.provider_profiles.find(
                {"provider_id": {"$in": pids}}, {"_id": 0, "provider_id": 1, "display_name": 1}
            ).to_list(500)
        }
        for e in items:
            e["provider_name"] = names.get(e.get("provider_id")) or ""
    return {"enquiries": items, "unread": sum(1 for e in items if not e.get("read"))}


class EnquiryReadUpdate(BaseModel):
    read: bool = True


@api_router.put("/enquiries/{enquiry_id}/read")
async def mark_enquiry_read(
    enquiry_id: str,
    body: EnquiryReadUpdate,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    result = await db.enquiries.update_one(
        {"enquiry_id": enquiry_id, "user_id_provider": current_user.user_id},
        {"$set": {"read": body.read}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"ok": True, "read": body.read}


@api_router.delete("/enquiries/{enquiry_id}")
async def delete_enquiry(enquiry_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    result = await db.enquiries.delete_one(
        {"enquiry_id": enquiry_id, "user_id_provider": current_user.user_id},
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enquiry not found")
    return {"ok": True, "deleted": enquiry_id}


class EnquiryReply(BaseModel):
    message: str


@api_router.post("/enquiries/{enquiry_id}/reply")
async def reply_to_enquiry(
    enquiry_id: str,
    body: EnquiryReply,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    text = (body.message or "").strip()
    if len(text) < 2:
        raise HTTPException(status_code=400, detail="Reply is too short")

    enq = await db.enquiries.find_one(
        {"enquiry_id": enquiry_id, "user_id_provider": current_user.user_id},
        {"_id": 0},
    )
    if not enq:
        raise HTTPException(status_code=404, detail="Enquiry not found")

    client_email = (enq.get("email") or "").strip()
    if not client_email:
        raise HTTPException(status_code=400, detail="This enquiry has no reply address")

    # Reply-to = the public contact e-mail on the profile (never the private account e-mail)
    prof = await db.provider_profiles.find_one({"provider_id": enq.get("provider_id")}, {"_id": 0, "display_name": 1, "contact": 1})
    provider_name = (prof or {}).get("display_name") or current_user.name or "Elite Escorts Europe"
    provider_email = current_user.email
    public_email = (((prof or {}).get("contact") or {}).get("email") or "").strip()
    subject = f"Re: Your request to {provider_name} on Elite Escorts Europe"
    safe_msg = text.replace("\n", "<br/>")
    html = f"""
    <div style="font-family: Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color:#000000;">
      <h2 style="color:#832161; margin:0 0 12px;">Elite Escorts Europe</h2>
      <p style="color:#DA4167; font-size:12px; letter-spacing:2px; text-transform:uppercase; margin:0 0 24px;">Reply from your enquiry</p>
      <p>Hi {enq.get('name') or 'there'},</p>
      <p>{provider_name} has replied to your enquiry:</p>
      <div style="background:#F0EFF4; border-left:3px solid #DA4167; padding:16px; margin:16px 0;">{safe_msg}</div>
      <p style="color:#898989; font-size:12px; margin-top:32px;">
        Reply directly to this email to continue the conversation.
      </p>
    </div>
    """

    sent = False
    if RESEND_API_KEY:
        try:
            payload = {
                "from": f"Elite Escorts Europe <{SENDER_EMAIL}>",
                "to": [client_email],
                "subject": subject,
                "html": html,
            }
            if public_email:
                payload["reply_to"] = [public_email]
            await asyncio.to_thread(resend.Emails.send, payload)
            sent = True
        except Exception as e:
            logger.error(f"Enquiry reply email failed to {client_email}: {e}")

    # Log the reply on the enquiry document
    reply_entry = {
        "message": text,
        "sent_by": provider_email,
        "sent_at": datetime.now(timezone.utc).isoformat(),
        "delivered": sent,
    }
    await db.enquiries.update_one(
        {"enquiry_id": enquiry_id},
        {"$push": {"replies": reply_entry}, "$set": {"read": True}},
    )
    return {"ok": True, "delivered": sent, "to": client_email}


# --------------------------------------------------------------------- Invoices

@api_router.get("/invoices/mine")
async def list_my_invoices(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    profile = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1})
    if not profile:
        return {"invoices": []}
    cursor = db.payment_transactions.find(
        {"provider_id": profile["provider_id"], "payment_status": "paid"},
        {"_id": 0},
    ).sort("created_at", -1).limit(200)
    items = []
    async for row in cursor:
        ts = row.get("created_at") or row.get("completed_at")
        items.append({
            "invoice_id": row.get("session_id") or row.get("transaction_id"),
            "amount": row.get("amount_total") or row.get("amount"),
            "currency": (row.get("currency") or "eur").upper(),
            "plan": (row.get("metadata") or {}).get("plan_id") or (row.get("metadata") or {}).get("kind", "subscription_purchase"),
            "featured_id": (row.get("metadata") or {}).get("featured_id"),
            "vip_id": (row.get("metadata") or {}).get("vip_id"),
            "auto_renew": (row.get("metadata") or {}).get("auto_renew") == "1",
            "created_at": ts.isoformat() if isinstance(ts, datetime) else ts,
        })
    return {"invoices": items}


@api_router.get("/providers/media/mine")
async def list_my_media(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
):
    """Provider-facing media list: merges provider_media (pending/rejected/video with review
    state) with the profile's flat approved `photos` array, so the dashboard can show
    'In review' badges and video thumbs alongside approved photos."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    profile = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1, "photos": 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    pid = profile["provider_id"]
    photos = profile.get("photos") or []
    docs = await db.provider_media.find({"provider_id": pid}, {"_id": 0}).sort("uploaded_at", 1).to_list(200)
    items = []
    seen = set()
    for m in docs:
        url = m.get("url")
        items.append({
            "media_id": m.get("media_id"),
            "url": url,
            "media_type": m.get("media_type") or "photo",
            "status": m.get("status") or "approved",
            "file_name": m.get("file_name"),
            "position": m.get("position"),
        })
        if url:
            seen.add(url)
    # approved photos stored directly on the profile but not tracked in provider_media
    for idx, url in enumerate(photos):
        if url in seen:
            continue
        items.append({
            "media_id": f"photo_{idx}",
            "url": url,
            "media_type": "photo",
            "status": "approved",
        })
    # order: photos as ordered on the profile (first = cover), then photos in review, then videos
    prof_rank = {u: n for n, u in enumerate(photos)}
    def _rank(it):
        if it["media_type"] == "video":
            return (2, it.get("position") or 0)
        if it["url"] in prof_rank:
            return (0, prof_rank[it["url"]])
        return (1, it.get("position") or 0)
    items.sort(key=_rank)
    return {"media": items}

@api_router.post("/providers/media")
async def upload_my_media(
    file: UploadFile = File(...),
    provider_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    """Upload one photo or video. It is stored on disk and queued for review ("pending");
    an admin approval publishes it on the profile."""
    profile = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Create your profile first, then add photos and videos.")
    kind = MEDIA_TYPES.get((file.content_type or '').lower())
    if not kind:
        raise HTTPException(status_code=400, detail="Use JPG, PNG or WebP photos, or MP4 or MOV videos.")
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="This file is larger than 10 MB. Choose a smaller file.")
    media_type, ext = kind
    media_id = f"media_{uuid.uuid4().hex[:16]}"
    name = f"{media_id}{ext}"
    (UPLOAD_DIR / name).write_bytes(data)
    last = await db.provider_media.find({"provider_id": profile["provider_id"]}, {"_id": 0, "position": 1}).sort("position", -1).to_list(1)
    doc = {
        "media_id": media_id,
        "provider_id": profile["provider_id"],
        "url": f"{APP_URL}/api/media/files/{name}" if APP_URL else f"/api/media/files/{name}",
        "media_type": media_type,
        "status": "pending",
        "file_name": (file.filename or name)[:120],
        "position": ((last[0].get("position") or 0) + 1) if last else 1,
        "uploaded_at": datetime.now(timezone.utc),
    }
    await db.provider_media.insert_one(dict(doc))
    doc["uploaded_at"] = doc["uploaded_at"].isoformat()
    return doc


@api_router.get("/media/files/{name}")
async def serve_media_file(name: str):
    if not re.fullmatch(r"media_[0-9a-f]{16}\.(jpg|png|webp|mp4|mov)", name):
        raise HTTPException(status_code=404, detail="Not found")
    path = UPLOAD_DIR / name
    if not path.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})


@api_router.delete("/providers/media/{media_id}")
async def delete_my_media(media_id: str, provider_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Remove a photo or video. `media_id` may also be `photo_<index>` for photos stored directly on the profile."""
    profile = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1, "photos": 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    pid = profile["provider_id"]
    if media_id.startswith("photo_"):
        try:
            url = (profile.get("photos") or [])[int(media_id.split("_", 1)[1])]
        except (ValueError, IndexError):
            raise HTTPException(status_code=404, detail="Photo not found")
        await db.provider_profiles.update_one({"provider_id": pid}, {"$pull": {"photos": url}})
        return {"status": "deleted"}
    m = await db.provider_media.find_one({"media_id": media_id, "provider_id": pid})
    if not m:
        raise HTTPException(status_code=404, detail="Media not found")
    await db.provider_media.delete_one({"media_id": media_id})
    await db.provider_profiles.update_one({"provider_id": pid}, {"$pull": {"photos": m.get("url")}})
    try:
        (UPLOAD_DIR / m["url"].rsplit("/", 1)[-1]).unlink(missing_ok=True)
    except Exception:
        pass
    return {"status": "deleted"}


class MediaOrder(BaseModel):
    urls: List[str]  # photos (or videos) in the new order; first photo = cover


@api_router.put("/providers/media/order")
async def reorder_my_media(body: MediaOrder, provider_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    profile = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1, "photos": 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    pid = profile["provider_id"]
    rank = {u: i for i, u in enumerate(body.urls)}
    photos = profile.get("photos") or []
    ordered = sorted(photos, key=lambda u: rank.get(u, len(rank) + photos.index(u)))
    await db.provider_profiles.update_one({"provider_id": pid}, {"$set": {"photos": ordered}})
    for u, i in rank.items():
        await db.provider_media.update_one({"provider_id": pid, "url": u}, {"$set": {"position": i}})
    return {"status": "ok"}


@api_router.get("/invoices/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    inline: int = 0,
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    profile = await db.provider_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0, "provider_id": 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    tx = await db.payment_transactions.find_one(
        {"$or": [{"session_id": invoice_id}, {"transaction_id": invoice_id}], "provider_id": profile["provider_id"]},
        {"_id": 0},
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Build PDF on-the-fly
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.colors import HexColor, black
    from reportlab.pdfgen import canvas as pdfcanvas

    buf = BytesIO()
    c = pdfcanvas.Canvas(buf, pagesize=A4)
    w, h = A4
    # Header
    c.setFillColor(HexColor("#832161"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(22 * mm, h - 30 * mm, "Elite Escorts Europe")
    c.setFillColor(HexColor("#DA4167"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(22 * mm, h - 38 * mm, "INVOICE")

    # Meta
    c.setFillColor(black)
    c.setFont("Helvetica", 10)
    ts = tx.get("completed_at") or tx.get("created_at")
    if isinstance(ts, datetime):
        ts_s = ts.strftime("%Y-%m-%d %H:%M UTC")
    else:
        ts_s = str(ts or "")
    y = h - 55 * mm
    c.drawString(22 * mm, y, f"Invoice ID: {invoice_id}")
    y -= 6 * mm
    c.drawString(22 * mm, y, f"Date: {ts_s}")
    y -= 6 * mm
    c.drawString(22 * mm, y, f"Provider: {current_user.name} ({current_user.email})")

    # Line item box
    y -= 14 * mm
    c.setFillColor(HexColor("#4B4B4B"))
    c.rect(22 * mm, y, w - 44 * mm, 8 * mm, fill=True, stroke=False)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 10)
    c.drawString(24 * mm, y + 2.5 * mm, "Description")
    c.drawRightString(w - 24 * mm, y + 2.5 * mm, "Amount")

    y -= 12 * mm
    meta = tx.get("metadata") or {}
    line_parts = []
    if meta.get("featured_id"):
        line_parts.append(f"Featured listing · {meta['featured_id']}")
    if meta.get("vip_id"):
        line_parts.append(f"VIP · {meta['vip_id']}")
    if not line_parts:
        line_parts.append(str(meta.get("plan_id") or "Subscription purchase"))
    c.setFillColor(black)
    c.setFont("Helvetica", 10)
    c.drawString(24 * mm, y, " + ".join(line_parts))
    amount = tx.get("amount_total") or tx.get("amount") or 0
    currency = (tx.get("currency") or "eur").upper()
    c.drawRightString(w - 24 * mm, y, f"{currency} {amount:.2f}")

    y -= 12 * mm
    c.setStrokeColor(HexColor("#dbdadd"))
    c.line(22 * mm, y, w - 22 * mm, y)
    y -= 8 * mm
    c.setFont("Helvetica-Bold", 11)
    c.drawString(24 * mm, y, "Total")
    c.drawRightString(w - 24 * mm, y, f"{currency} {amount:.2f}")

    # Footer
    c.setFillColor(HexColor("#898989"))
    c.setFont("Helvetica", 8)
    c.drawString(22 * mm, 20 * mm, "Elite Escorts Europe · Bringing your secret desire closer to you")
    c.showPage()
    c.save()
    pdf_bytes = buf.getvalue()
    disposition = "inline" if inline else "attachment"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'{disposition}; filename="invoice-{invoice_id}.pdf"'},
    )




@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook: update payment_transactions and activate subscriptions."""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    stripe = _stripe_checkout(request)
    try:
        evt = await stripe.handle_webhook(body, signature)
    except Exception as e:  # noqa: BLE001
        logging.exception("Stripe webhook parse failed")
        raise HTTPException(status_code=400, detail=str(e))

    if evt.session_id:
        await db.payment_transactions.update_one(
            {"session_id": evt.session_id},
            {"$set": {
                "payment_status": evt.payment_status,
                "webhook_event_type": evt.event_type,
                "webhook_event_id": evt.event_id,
            }},
        )
        if evt.payment_status == "paid":
            await _activate_subscription_for_session(evt.session_id)
    return {"received": True}


# ---------- Geo helpers for distance-based browse sorting ----------
_ip_geo_mem: Dict[str, Any] = {}  # ip -> (coords_or_None, expires_ts)


def _visitor_ip(request: Request) -> Optional[str]:
    """Return the first public IP from X-Forwarded-For (leftmost = original client), else peer."""
    xff = request.headers.get("x-forwarded-for", "")
    candidates = [c.strip() for c in xff.split(",") if c.strip()]
    if request.client and request.client.host:
        candidates.append(request.client.host)
    for ip in candidates:
        try:
            addr = ipaddress.ip_address(ip)
        except ValueError:
            continue
        if not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved or addr.is_unspecified):
            return str(addr)
    return None


async def _get_ip_coords(ip: Optional[str]):
    """(lat, lng) for a public IP via ipgeolocation.io v3, cached 24h. None on failure/private IP."""
    if not IPGEOLOCATION_API_KEY or not ip:
        return None
    now_ts = time.time()
    cached = _ip_geo_mem.get(ip)
    if cached and cached[1] > now_ts:
        return cached[0]
    doc = await db.ip_geo_cache.find_one({"_id": ip})
    if doc and doc.get("expires_at", 0) > now_ts:
        coords = (doc["lat"], doc["lng"]) if doc.get("lat") is not None else None
        _ip_geo_mem[ip] = (coords, now_ts + 3600)
        return coords
    coords = None
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            r = await client.get(
                "https://api.ipgeolocation.io/v3/ipgeo",
                params={"apiKey": IPGEOLOCATION_API_KEY, "ip": ip, "fields": "location"},
            )
        if r.status_code == 200:
            loc = r.json().get("location", {})
            lat, lng = loc.get("latitude"), loc.get("longitude")
            if lat is not None and lng is not None:
                coords = (float(lat), float(lng))
    except Exception as e:
        logger.error(f"IP geolocation failed for {ip}: {e}")
    await db.ip_geo_cache.replace_one(
        {"_id": ip},
        {"_id": ip, "lat": coords[0] if coords else None, "lng": coords[1] if coords else None,
         "expires_at": now_ts + 86400},
        upsert=True,
    )
    _ip_geo_mem[ip] = (coords, now_ts + 3600)
    return coords


async def _geocode_city(city: str, country: str = ""):
    """Forward-geocode a city to (lat, lng) via OSM Nominatim, cached in DB. None on failure."""
    if not city:
        return None
    key = f"{city.strip().lower()}|{(country or '').strip().lower()}"
    doc = await db.geocode_cache.find_one({"_id": key})
    if doc:
        return (doc["lat"], doc["lng"]) if doc.get("lat") is not None else None
    coords = None
    try:
        q = f"{city}, {country}" if country else city
        async with httpx.AsyncClient(
            timeout=5.0,
            headers={"User-Agent": "EliteEscortsEurope/1.0 (info@eliteescortseurope.eu)"},
        ) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": q, "format": "json", "limit": 1},
            )
        if r.status_code == 200:
            arr = r.json()
            if arr:
                coords = (float(arr[0]["lat"]), float(arr[0]["lon"]))
    except Exception as e:
        logger.error(f"Geocoding failed for '{city}': {e}")
    await db.geocode_cache.replace_one(
        {"_id": key},
        {"_id": key, "lat": coords[0] if coords else None, "lng": coords[1] if coords else None},
        upsert=True,
    )
    return coords


@api_router.get("/geo/reverse")
async def reverse_geocode(lat: float, lng: float):
    """City name for the visitor's device location (Browse: 'Showing results nearest to <city>').
    Rounded to ~1 km and cached; returns {"city": null} when unknown. The location is not stored with any user."""
    rl, rg = round(lat, 2), round(lng, 2)
    key = f"rev|{rl}|{rg}"
    doc = await db.geocode_cache.find_one({"_id": key})
    if doc:
        return {"city": doc.get("city")}
    city = None
    try:
        async with httpx.AsyncClient(
            timeout=5.0,
            headers={"User-Agent": "EliteEscortsEurope/1.0 (info@eliteescortseurope.eu)"},
        ) as client:
            r = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"lat": rl, "lon": rg, "format": "json", "zoom": 10, "accept-language": "en"},
            )
        if r.status_code == 200:
            addr = (r.json() or {}).get("address") or {}
            city = addr.get("city") or addr.get("town") or addr.get("village") or addr.get("municipality")
    except Exception as e:
        logger.error(f"Reverse geocoding failed: {e}")
    await db.geocode_cache.replace_one({"_id": key}, {"_id": key, "city": city}, upsert=True)
    return {"city": city}


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@api_router.get("/providers")
async def browse_providers(
    request: Request,
    city: Optional[str] = None,
    service: Optional[str] = None,
    min_rate: Optional[float] = None,
    max_rate: Optional[float] = None,
    gender: Optional[str] = None,
    # ----- Physical characteristic filters -----
    nationality: Optional[str] = None,
    ethnicity: Optional[str] = None,
    orientation: Optional[str] = None,
    eye_color: Optional[str] = None,
    hair_color: Optional[str] = None,
    hair_length: Optional[str] = None,
    breast_size: Optional[str] = None,
    breast_type: Optional[str] = None,
    pubic_hair: Optional[str] = None,
    languages: Optional[str] = None,  # comma-separated; provider must speak ALL
    tattoos: Optional[str] = None,
    piercings: Optional[str] = None,
    smoker: Optional[str] = None,
    min_height: Optional[float] = None,
    max_height: Optional[float] = None,
    min_weight: Optional[float] = None,
    max_weight: Optional[float] = None,
    min_age: Optional[int] = None,
    max_age: Optional[int] = None,
    # Per-visit shuffle seed (sent by /browse once per visit, so the order stays stable while filtering)
    seed: Optional[int] = None,
    # Visitor-selected location override for distance sorting (overrides IP geolocation)
    origin_lat: Optional[float] = None,
    origin_lng: Optional[float] = None,
    origin_city: Optional[str] = None,
    origin_country: Optional[str] = None,
):
    """Browse and search providers"""
    query: dict = {"verified": True, "available": True, "suspended": {"$ne": True}}

    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}

    if service:
        service = service.strip()
        if "." in service or service.startswith("$"):
            raise HTTPException(status_code=400, detail="Invalid service")
        # services is stored as a list of names (legacy) or a dict {name: {type, price}};
        # in the dict form an unticked service keeps type None.
        query.setdefault("$and", []).append({"$or": [
            {"services": service},
            {f"services.{service}.type": {"$nin": [None, ""]}},
        ]})

    if min_rate is not None or max_rate is not None:
        # 1-hour rate, incall or outcall (nested) or legacy flat (rates.1hour).
        query.setdefault("$and", []).append({"$or": [
            _numeric_range_cond(path, min_rate, max_rate)
            for path in ("rates.incall.1hour", "rates.outcall.1hour", "rates.1hour")
        ]})

    if gender:
        query["gender"] = gender

    # Categorical characteristic filters (exact match)
    char_eq = {
        "ethnicity": ethnicity,
        "orientation": orientation,
        "eye_color": eye_color,
        "hair_color": hair_color,
        "hair_length": hair_length,
        "breast_size": breast_size,
        "breast_type": breast_type,
        "pubic_hair": pubic_hair,
        "tattoos": tattoos,
        "piercings": piercings,
        "smoker": smoker,
    }
    for key, value in char_eq.items():
        if value:
            query[f"characteristics.{key}"] = value

    if nationality:
        query["characteristics.nationality"] = {"$regex": nationality, "$options": "i"}

    if languages:
        langs = [l.strip() for l in languages.split(",") if l.strip()]
        if langs:
            query["characteristics.languages"] = {"$all": langs}

    _add_numeric_range_expr(query, "characteristics.height", min_height, max_height)
    _add_numeric_range_expr(query, "characteristics.weight", min_weight, max_weight)
    _add_numeric_range_expr(query, "age", min_age, max_age)

    # Subscription gate: active Featured plan, or lapsed within the grace period.
    # Mongo returns naive datetimes — compare in naive UTC.
    now = datetime.utcnow()
    query["featured_until"] = {"$gt": now - timedelta(days=GRACE_DAYS)}

    profiles = await db.provider_profiles.find(query, {"_id": 0}).to_list(200)

    # Annotate vip_active for the frontend.
    for p in profiles:
        vu = p.get("vip_until")
        p["vip_active"] = bool(vu and vu > now)

    # Order: VIPs on top, then the rest. Within each group profiles are grouped in
    # distance zones (<=10, <=25, <=50, <=100 km, further, unknown) and shuffled within
    # a zone, so the top rows differ per visit. Without the visitor's location there are
    # no zones: VIPs shuffled, then the rest shuffled.
    shuffle_seed = seed if seed is not None else random.randrange(1 << 30)
    def _shuffle_key(p):
        return random.Random(f"{shuffle_seed}:{p.get('provider_id', '')}").random()
    # A visitor-selected city (origin_city) overrides IP-based geolocation.
    visitor_coords = None
    if origin_lat is not None and origin_lng is not None:
        visitor_coords = (origin_lat, origin_lng)
    if not visitor_coords and origin_city:
        visitor_coords = await _geocode_city(origin_city, origin_country or "")
    if not visitor_coords:
        visitor_coords = await _get_ip_coords(_visitor_ip(request))
    if visitor_coords:
        vlat, vlng = visitor_coords
        for p in profiles:
            loc = p.get("location") or {}
            plat, plng = loc.get("lat"), loc.get("lng")
            if plat is None or plng is None:
                coords = await _geocode_city(loc.get("city", ""), loc.get("country", ""))
                if coords:
                    plat, plng = coords
                    await db.provider_profiles.update_one(
                        {"provider_id": p["provider_id"]},
                        {"$set": {"location.lat": plat, "location.lng": plng}},
                    )
                    p.setdefault("location", {})["lat"] = plat
                    p["location"]["lng"] = plng
            p["distance_km"] = round(_haversine_km(vlat, vlng, plat, plng), 1) if (plat is not None and plng is not None) else None
        profiles.sort(
            key=lambda p: (
                0 if p["vip_active"] else 1,          # VIPs first
                _distance_zone(p.get("distance_km")),  # nearest zone first
                _shuffle_key(p),                       # shuffled within the zone
            )
        )
    else:
        profiles.sort(
            key=lambda p: (
                0 if p["vip_active"] else 1,  # VIPs first
                _shuffle_key(p),               # shuffled
            )
        )

    # Add user info (batch fetch to avoid N+1 queries)
    user_ids = [p["user_id"] for p in profiles]
    users = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
    ).to_list(len(user_ids) or 1)
    user_map = {u["user_id"]: u for u in users}
    for profile in profiles:
        u = user_map.get(profile["user_id"])
        profile["user"] = {k: v for k, v in (u or {}).items() if k != "user_id"} if u else None

    return profiles

@api_router.get("/providers/{provider_id}")
async def get_provider_detail(provider_id: str):
    """Get provider profile detail"""
    profile = await db.provider_profiles.find_one(
        {"provider_id": provider_id},
        {"_id": 0}
    )
    
    if not profile:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Get user info
    user = await db.users.find_one(
        {"user_id": profile["user_id"]},
        {"_id": 0, "name": 1, "picture": 1, "email": 1, "account_type": 1}
    )
    profile["user"] = user

    # Annotate active subscription flags for the frontend (Mongo dates are naive UTC)
    now = datetime.utcnow()
    profile["featured_active"] = bool(profile.get("featured_until") and profile["featured_until"] > now)
    profile["in_grace"] = _grace_state(profile.get("featured_until"), now)["in_grace"]
    profile["vip_active"] = bool(profile.get("vip_until") and profile["vip_until"] > now)

    # Approved videos for the public gallery (photos come from the profile's `photos` array)
    vids = await db.provider_media.find(
        {"provider_id": provider_id, "media_type": "video", "status": "approved"},
        {"_id": 0, "url": 1},
    ).sort("uploaded_at", 1).to_list(20)
    profile["videos"] = [v["url"] for v in vids if v.get("url")]

    return profile

@api_router.post("/providers/profile")
async def create_provider_profile(
    profile_data: ProviderProfileCreate,
    current_user: User = Depends(get_current_user)
):
    """Create provider profile"""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Only providers can create profiles")
    
    # Independent providers may have only one profile. Agencies may create many.
    existing = await db.provider_profiles.find_one({"user_id": current_user.user_id})
    if existing and current_user.account_type != "agency":
        raise HTTPException(status_code=400, detail="Profile already exists")
    
    provider_id = f"provider_{uuid.uuid4().hex[:12]}"
    data = profile_data.model_dump()
    data["photos"] = []  # photos are added through upload + review
    data["rates"] = _normalize_rates(data.get("rates"))
    profile_doc = {
        "provider_id": provider_id,
        "user_id": current_user.user_id,
        **data,
        "verified": False,
        "verification_status": "pending",
        "available": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.provider_profiles.insert_one(profile_doc)
    
    return {"provider_id": provider_id, "message": "Profile created successfully"}

@api_router.put("/providers/profile")
async def update_provider_profile(
    updates: ProviderProfileUpdate,
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Update provider profile"""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Only providers can update profiles")
    
    profile = await _resolve_owned_profile(current_user, provider_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    # Photos are only published through upload + admin review (POST /providers/media), never set directly
    update_data.pop("photos", None)
    if "rates" in update_data:
        update_data["rates"] = _normalize_rates(update_data["rates"])
    
    if update_data:
        await db.provider_profiles.update_one(
            {"provider_id": profile["provider_id"]},
            {"$set": update_data}
        )
    
    return {"message": "Profile updated successfully"}


@api_router.delete("/providers/profile")
async def delete_provider_profile(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Permanently delete the authenticated provider's profile and related data"""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Only providers can delete profiles")

    profile = await _resolve_owned_profile(current_user, provider_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    pid = profile.get("provider_id")
    # Remove related records
    await db.provider_profiles.delete_one({"provider_id": pid})
    if pid:
        await db.subscriptions.delete_many({"provider_id": pid})
        await db.payment_transactions.delete_many({"provider_id": pid})
        await db.verifications.delete_many({"provider_id": pid})
        await db.verification_documents.delete_many({"provider_id": pid})
        await db.enquiries.delete_many({"provider_id": pid})
        await db.conversations.delete_many({"provider_id": pid})

    return {"message": "Profile deleted successfully"}


@api_router.get("/agency/profiles")
async def list_agency_profiles(current_user: User = Depends(get_current_user)):
    """List every provider profile owned by the current user (for agency roster)."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    now = datetime.utcnow()
    cursor = db.provider_profiles.find(
        {"user_id": current_user.user_id}, {"_id": 0}
    ).sort("created_at", 1)
    profiles = []
    async for p in cursor:
        featured_until = p.get("featured_until")
        vip_until = p.get("vip_until")
        featured_active = bool(featured_until and featured_until > now)
        vip_active = bool(vip_until and vip_until > now)
        done, total, selectable = _profile_completion(p)
        loc = p.get("location") or {}
        photos = p.get("photos") or []
        # count unread enquiries for this profile
        unread = await db.enquiries.count_documents(
            {"provider_id": p["provider_id"], "read": False}
        )
        active_plan_label = None
        auto_renew_pref = True
        if featured_active:
            afp = p.get("active_featured_plan") or ""
            meta = AGENCY_PLANS.get(afp) or PLANS.get(afp)
            active_plan_label = meta["label"] if meta else "Featured"
            if vip_active:
                active_plan_label += " + VIP"
            sub = await db.subscriptions.find_one(
                {"provider_id": p["provider_id"]}, sort=[("created_at", -1)]
            )
            auto_renew_pref = bool(sub.get("auto_renew", True)) if sub else True
        profiles.append({
            "provider_id": p["provider_id"],
            "display_name": p.get("display_name") or "Untitled profile",
            "bio": p.get("bio") or p.get("essence") or "",
            "location": loc,
            "city": loc.get("city"),
            "age": p.get("age"),
            "photo": photos[0] if photos else None,
            "verification_status": p.get("verification_status", "pending"),
            "verified": p.get("verified", False),
            "featured_active": featured_active,
            "featured_until": featured_until.isoformat() if featured_until else None,
            "featured_days_left": _days_left_dt(featured_until, now),
            "vip_active": vip_active,
            "active_plan_label": active_plan_label,
            "auto_renew": auto_renew_pref,
            **_grace_state(featured_until, now),
            "pending_plan": p.get("pending_plan"),
            "completed_steps": done,
            "total_steps": total,
            "plan_selectable": selectable,
            "unread_enquiries": unread,
        })
    return {"profiles": profiles, "account_type": current_user.account_type}


class AgencyProfileBody(BaseModel):
    agency_name: str
    location: Dict[str, Any] = {}
    description: Optional[str] = None
    languages: List[str] = []
    contact: Optional[Dict[str, Any]] = None
    default_services: Any = {}
    apply_services_to_all: bool = False
    default_rates: Dict[str, Any] = {}
    default_availability: Optional[Dict[str, Any]] = None
    apply_rates_to_all: bool = False
    accepts_disabilities: bool = False


@api_router.get("/agency/profile")
async def get_agency_profile(current_user: User = Depends(get_current_user)):
    """Return the agency master profile (defaults) or {onboarded: False} if not set up yet."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    doc = await db.agency_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not doc:
        return {"onboarded": False}
    # Lazy backfill of the public agency_id for docs created before this field existed
    if not doc.get("agency_id"):
        agency_id = f"agency_{uuid.uuid4().hex[:12]}"
        await db.agency_profiles.update_one(
            {"user_id": current_user.user_id}, {"$set": {"agency_id": agency_id}}
        )
        doc["agency_id"] = agency_id
    doc["onboarded"] = True
    return doc


@api_router.post("/agency/profile")
async def save_agency_profile(
    body: AgencyProfileBody,
    current_user: User = Depends(get_current_user),
):
    """Create/update the agency master profile. When apply_services_to_all is on,
    the default services are copied into every existing agency profile."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    data = body.model_dump()
    data["default_rates"] = _normalize_rates(data.get("default_rates"))
    doc = {
        "user_id": current_user.user_id,
        **data,
        "onboarded": True,
        "updated_at": datetime.now(timezone.utc),
    }
    await db.agency_profiles.update_one(
        {"user_id": current_user.user_id},
        {"$set": doc, "$setOnInsert": {"created_at": datetime.now(timezone.utc), "agency_id": f"agency_{uuid.uuid4().hex[:12]}"}},
        upsert=True,
    )
    # Propagate services to all existing profiles when requested
    if body.apply_services_to_all and body.default_services:
        await db.provider_profiles.update_many(
            {"user_id": current_user.user_id},
            {"$set": {"services": body.default_services, "accepts_disabilities": body.accepts_disabilities}},
        )
    # Propagate rates & availability to all existing profiles when requested
    if body.apply_rates_to_all:
        rate_fields: Dict[str, Any] = {}
        if data.get("default_rates"):
            rate_fields["rates"] = data["default_rates"]
        da = data.get("default_availability") or {}
        if da.get("availability_type"):
            rate_fields["availability_type"] = da["availability_type"]
        if da.get("schedule"):
            rate_fields["schedule"] = da["schedule"]
        if "available247" in da:
            rate_fields["available247"] = da["available247"]
        if "booking_advance" in da:
            rate_fields["booking_advance"] = da["booking_advance"]
        if rate_fields:
            await db.provider_profiles.update_many(
                {"user_id": current_user.user_id},
                {"$set": rate_fields},
            )
    return {"ok": True, "onboarded": True}


@api_router.delete("/agency/profile")
async def delete_agency_profile(current_user: User = Depends(get_current_user)):
    """Permanently delete the agency master profile and every companion profile it owns."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    pids = [p["provider_id"] async for p in db.provider_profiles.find({"user_id": current_user.user_id}, {"_id": 0, "provider_id": 1})]
    if pids:
        await db.provider_profiles.delete_many({"provider_id": {"$in": pids}})
        for coll in (db.subscriptions, db.payment_transactions, db.verifications, db.verification_documents, db.enquiries, db.conversations):
            await coll.delete_many({"provider_id": {"$in": pids}})
    await db.agency_profiles.delete_one({"user_id": current_user.user_id})
    return {"message": "Agency profile deleted", "profiles_removed": len(pids)}


@api_router.post("/agency/sync-defaults")
async def sync_agency_defaults(current_user: User = Depends(get_current_user)):
    """Cascade the agency's default services / rates / availability onto every profile it owns."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    ag = await db.agency_profiles.find_one({"user_id": current_user.user_id}, {"_id": 0})
    if not ag:
        raise HTTPException(status_code=400, detail="Set up your agency first")

    set_fields: Dict[str, Any] = {}
    if ag.get("default_services"):
        set_fields["services"] = ag["default_services"]
    if ag.get("default_rates"):
        set_fields["rates"] = _normalize_rates(ag["default_rates"])
    da = ag.get("default_availability") or {}
    if da.get("availability_type"):
        set_fields["availability_type"] = da["availability_type"]
    if da.get("schedule"):
        set_fields["schedule"] = da["schedule"]
    if "available247" in da:
        set_fields["available247"] = da["available247"]
    if "booking_advance" in da:
        set_fields["booking_advance"] = da["booking_advance"]
    if "worldwide_travel" in da:
        set_fields["worldwide_travel"] = da["worldwide_travel"]
    if "accepts_disabilities" in ag:
        set_fields["accepts_disabilities"] = bool(ag.get("accepts_disabilities"))

    if not set_fields:
        return {"ok": True, "updated": 0}

    result = await db.provider_profiles.update_many(
        {"user_id": current_user.user_id},
        {"$set": set_fields},
    )
    return {"ok": True, "updated": result.modified_count}


class ProfilePlanBody(BaseModel):
    featured_plan: Optional[str] = None  # "agency_featured_2w" | "agency_featured_4w" | None to clear
    vip_plan: Optional[str] = None


@api_router.put("/agency/profiles/{provider_id}/plan")
async def set_profile_plan(
    provider_id: str,
    body: ProfilePlanBody,
    current_user: User = Depends(get_current_user),
):
    """Queue (or clear) the Featured (+ optional VIP) plan a profile will be paid for at checkout."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    profile = await _resolve_owned_profile(current_user, provider_id, {"_id": 0, "provider_id": 1})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    pending = None
    if body.featured_plan:
        feat = AGENCY_PLANS.get(body.featured_plan)
        if not feat or feat["kind"] != "featured":
            raise HTTPException(status_code=400, detail="Invalid plan")
        vip_plan = None
        if body.vip_plan:
            vp = AGENCY_PLANS.get(body.vip_plan)
            if not vp or vp["kind"] != "vip":
                raise HTTPException(status_code=400, detail="Invalid VIP plan")
            vip_plan = body.vip_plan
        pending = {"featured_plan": body.featured_plan, "vip_plan": vip_plan}

    await db.provider_profiles.update_one(
        {"provider_id": provider_id},
        {"$set": {"pending_plan": pending}},
    )
    return {"ok": True, "pending_plan": pending}


class BulkCheckoutBody(BaseModel):
    origin_url: str


@api_router.post("/subscriptions/checkout-bulk")
async def create_bulk_checkout(
    body: BulkCheckoutBody,
    http_request: Request,
    current_user: User = Depends(get_current_user),
):
    """One Stripe checkout that activates every agency profile with a queued (pending) plan."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")

    cursor = db.provider_profiles.find(
        {"user_id": current_user.user_id, "pending_plan": {"$ne": None}},
        {"_id": 0, "provider_id": 1, "pending_plan": 1, "display_name": 1},
    )
    raw = []
    async for p in cursor:
        pp = p.get("pending_plan") or {}
        if not AGENCY_PLANS.get(pp.get("featured_plan") or ""):
            continue
        raw.append((p["provider_id"], pp))

    # Grade = live profiles + profiles paid for now, each profile counted once.
    now_utc = datetime.utcnow()
    live_ids = set()
    async for lp in db.provider_profiles.find(
        {"user_id": current_user.user_id, "featured_until": {"$gt": now_utc}},
        {"_id": 0, "provider_id": 1},
    ):
        live_ids.add(lp["provider_id"])
    active_count = len(live_ids | {pid for pid, _ in raw})
    tier = _agency_tier(active_count)
    provider_plans = []
    total_amount = 0.0
    for provider_id, pp in raw:
        amt = _agency_amount(pp.get("featured_plan"), tier)
        if pp.get("vip_plan"):
            amt += _agency_amount(pp.get("vip_plan"), tier)
        total_amount += amt
        provider_plans.append({
            "provider_id": provider_id,
            "featured_plan": pp.get("featured_plan"),
            "vip_plan": pp.get("vip_plan"),
        })

    if not provider_plans:
        raise HTTPException(status_code=400, detail="Select a plan for at least one profile first")

    total_amount = round(total_amount, 2)
    metadata = {
        "user_id": current_user.user_id,
        "kind": "agency_bulk",
        "profile_count": str(len(provider_plans)),
        "active_count": str(active_count),
        "tier": tier,
    }
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}&agency=1"
    cancel_url = f"{origin}/dashboard"

    from emergentintegrations.payments.stripe.checkout import CheckoutSessionRequest
    stripe = _stripe_checkout(http_request)
    req = CheckoutSessionRequest(
        amount=total_amount,
        currency=CURRENCY,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    session = await stripe.create_checkout_session(req)

    await db.payment_transactions.insert_one({
        "session_id": session.session_id,
        "user_id": current_user.user_id,
        "provider_plans": provider_plans,
        "provider_ids": [pp["provider_id"] for pp in provider_plans],
        "amount": total_amount,
        "currency": CURRENCY,
        "metadata": metadata,
        "payment_status": "pending",
        "status": "open",
        "created_at": datetime.now(timezone.utc),
    })

    return {
        "url": session.url,
        "session_id": session.session_id,
        "amount": total_amount,
        "currency": CURRENCY,
        "profile_count": len(provider_plans),
    }


@api_router.get("/providers/dashboard/stats")
async def get_provider_dashboard(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get provider dashboard stats"""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    
    profile = await _resolve_owned_profile(
        current_user, provider_id, {"_id": 0, "created_at": 0}
    )
    
    if not profile:
        return {"profile": None, "stats": {}}
    
    # Get unread messages
    conversations = await db.conversations.find(
        {"provider_id": profile["provider_id"]},
        {"_id": 0, "conversation_id": 1}
    ).to_list(100)
    
    unread_count = 0
    for conv in conversations:
        unread = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": current_user.user_id},
            "read": False
        })
        unread_count += unread
    
    return {
        "profile": profile,
        "stats": {
            "unread_messages": unread_count
        }
    }

# ===== MESSAGING ROUTES =====

@api_router.get("/conversations")
async def get_conversations(current_user: User = Depends(get_current_user)):
    """Get user conversations"""
    if current_user.role == "client":
        query = {"client_id": current_user.user_id}
    elif current_user.role == "provider":
        profile = await db.provider_profiles.find_one({"user_id": current_user.user_id})
        if not profile:
            return []
        query = {"provider_id": profile["provider_id"]}
    else:
        query = {}
    
    conversations = await db.conversations.find(
        query,
        {"_id": 0}
    ).sort("last_message_at", -1).to_list(100)
    
    # Add participant details and unread count
    for conv in conversations:
        client = await db.users.find_one(
            {"user_id": conv["client_id"]},
            {"_id": 0, "name": 1, "picture": 1}
        )
        conv["client"] = client
        
        profile = await db.provider_profiles.find_one(
            {"provider_id": conv["provider_id"]},
            {"_id": 0, "display_name": 1, "photos": 1, "user_id": 1}
        )
        conv["provider"] = profile
        
        # Get unread count
        unread = await db.messages.count_documents({
            "conversation_id": conv["conversation_id"],
            "sender_id": {"$ne": current_user.user_id},
            "read": False
        })
        conv["unread_count"] = unread
    
    return conversations

@api_router.get("/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get conversation messages"""
    # Verify access
    conv = await db.conversations.find_one({"conversation_id": conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    if current_user.role == "client" and conv["client_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if current_user.role == "provider":
        profile = await db.provider_profiles.find_one({"user_id": current_user.user_id})
        if not profile or conv["provider_id"] != profile["provider_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await db.messages.find(
        {"conversation_id": conversation_id},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(1000)
    
    # Mark as read
    await db.messages.update_many(
        {
            "conversation_id": conversation_id,
            "sender_id": {"$ne": current_user.user_id},
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    return messages

@api_router.post("/messages")
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user)
):
    """Send message"""
    # Verify conversation access
    conv = await db.conversations.find_one({"conversation_id": message_data.conversation_id})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    message_id = f"msg_{uuid.uuid4().hex[:12]}"
    message_doc = {
        "message_id": message_id,
        "conversation_id": message_data.conversation_id,
        "sender_id": current_user.user_id,
        "content": message_data.content,
        "timestamp": datetime.now(timezone.utc),
        "read": False
    }
    
    await db.messages.insert_one(message_doc)
    
    # Update conversation
    await db.conversations.update_one(
        {"conversation_id": message_data.conversation_id},
        {
            "$set": {
                "last_message": message_data.content,
                "last_message_at": datetime.now(timezone.utc)
            }
        }
    )
    
    return {"message_id": message_id}

@api_router.post("/conversations")
async def create_conversation(
    provider_id: str,
    current_user: User = Depends(get_current_user)
):
    """Create or get conversation"""
    if current_user.role != "client":
        raise HTTPException(status_code=403, detail="Only clients can start conversations")
    
    # Check if conversation exists
    existing = await db.conversations.find_one({
        "client_id": current_user.user_id,
        "provider_id": provider_id
    })
    
    if existing:
        return {"conversation_id": existing["conversation_id"]}
    
    # Create new conversation
    conversation_id = f"conv_{uuid.uuid4().hex[:12]}"
    conv_doc = {
        "conversation_id": conversation_id,
        "client_id": current_user.user_id,
        "provider_id": provider_id,
        "last_message": None,
        "last_message_at": None,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.conversations.insert_one(conv_doc)
    
    return {"conversation_id": conversation_id}

# ===== VERIFICATION ROUTES =====

@api_router.post("/verification/submit")
async def submit_verification(
    doc_data: VerificationSubmit,
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Submit verification documents (ID front + selfie with ID + optional secondary)."""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Only providers can submit verification")
    
    profile = await _resolve_owned_profile(current_user, provider_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Provider profile not found")
    
    # Invalidate any previous pending docs (they may resubmit after rejection)
    await db.verification_documents.delete_many({
        "provider_id": profile["provider_id"],
        "status": {"$in": ["pending", "rejected"]}
    })
    
    now = datetime.now(timezone.utc)
    docs = [
        {"doc_id": f"doc_{uuid.uuid4().hex[:12]}", "provider_id": profile["provider_id"],
         "document_type": "id_front", "document_url": doc_data.id_front,
         "status": "pending", "submitted_at": now, "reviewed_at": None},
        {"doc_id": f"doc_{uuid.uuid4().hex[:12]}", "provider_id": profile["provider_id"],
         "document_type": "id_selfie", "document_url": doc_data.id_selfie,
         "status": "pending", "submitted_at": now, "reviewed_at": None},
    ]
    if doc_data.secondary_doc:
        docs.append({
            "doc_id": f"doc_{uuid.uuid4().hex[:12]}", "provider_id": profile["provider_id"],
            "document_type": "secondary_doc", "document_url": doc_data.secondary_doc,
            "status": "pending", "submitted_at": now, "reviewed_at": None
        })
    await db.verification_documents.insert_many(docs)
    
    # Update profile status
    await db.provider_profiles.update_one(
        {"provider_id": profile["provider_id"]},
        {"$set": {"verification_status": "submitted", "rejection_reason": None}}
    )
    
    return {"message": "Verification submitted", "document_count": len(docs)}

@api_router.get("/verification/status")
async def get_verification_status(
    provider_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get verification status"""
    if current_user.role != "provider":
        raise HTTPException(status_code=403, detail="Provider access only")
    
    profile = await _resolve_owned_profile(
        current_user, provider_id,
        {"_id": 0, "verification_status": 1, "verified": 1, "provider_id": 1, "rejection_reason": 1}
    )
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    docs = await db.verification_documents.find(
        {"provider_id": profile.get("provider_id", "")},
        {"_id": 0, "document_url": 0}  # don't leak base64 URL in status response
    ).to_list(100)
    
    return {
        "verification_status": profile.get("verification_status", "pending"),
        "verified": profile.get("verified", False),
        "rejection_reason": profile.get("rejection_reason"),
        "documents": docs
    }

# ===== ADMIN ROUTES =====

@api_router.get("/admin/verifications")
async def get_pending_verifications(current_user: User = Depends(get_current_user)):
    """Get pending verifications (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    
    profiles = await db.provider_profiles.find(
        {"verification_status": {"$in": ["submitted"]}},
        {"_id": 0}
    ).to_list(100)
    
    for profile in profiles:
        docs = await db.verification_documents.find(
            {"provider_id": profile["provider_id"]},
            {"_id": 0}
        ).sort("submitted_at", -1).to_list(100)
        profile["documents"] = docs
        # Also expose user email + name for admin display
        user = await db.users.find_one(
            {"user_id": profile.get("user_id")},
            {"_id": 0, "email": 1, "name": 1}
        )
        profile["user"] = user
    
    return profiles

def _verification_email_html(display_name: str, approved: bool, reason: Optional[str]) -> str:
    """Branded email for verification approval / rejection."""
    if approved:
        headline = "You\u2019re verified"
        body = ("Congratulations! Your Lumi&egrave;re provider profile has been verified and is now "
                "live on the marketplace with the Verified badge. Clients searching your city will now "
                "see your profile in their results.")
    else:
        headline = "Verification needs attention"
        r = f"<p style=\"margin:0 0 16px 0;color:#A1A1AA;font-size:14px;line-height:1.6;\"><strong style=\"color:#F2F0ED;\">Reason:</strong> {reason or 'Documents did not meet requirements'}</p>"
        body = ("Unfortunately we couldn\u2019t verify your identity with the documents submitted. "
                "You can resubmit any time from your dashboard.") + r
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#0A0A0C;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0A0A0C;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#141416;border:1px solid #27272A;">
        <tr><td style="padding:40px 40px 24px 40px;text-align:center;">
          <h1 style="margin:0;color:#C6A87C;font-size:28px;font-weight:normal;letter-spacing:2px;">Lumi&egrave;re</h1>
        </td></tr>
        <tr><td style="padding:0 40px 24px 40px;">
          <h2 style="margin:0 0 16px 0;color:#F2F0ED;font-size:22px;font-weight:normal;">{headline}</h2>
          <p style="margin:0 0 16px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">Hi {display_name},</p>
          <p style="margin:0 0 24px 0;color:#A1A1AA;font-size:15px;line-height:1.6;">{body}</p>
        </td></tr>
        <tr><td style="padding:24px 40px;border-top:1px solid #27272A;text-align:center;">
          <p style="margin:0;color:#52525B;font-size:12px;">Lumi&egrave;re &middot; Discreet. Curated. Exceptional.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

@api_router.put("/admin/verifications/{provider_id}")
async def update_verification(
    provider_id: str,
    decision: VerificationDecision,
    current_user: User = Depends(get_current_user)
):
    """Approve or reject verification (admin only). Sends a branded email to the provider."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access only")
    
    if decision.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    profile = await db.provider_profiles.find_one({"provider_id": provider_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    await db.provider_profiles.update_one(
        {"provider_id": provider_id},
        {
            "$set": {
                "verification_status": decision.status,
                "verified": decision.status == "approved",
                "rejection_reason": decision.reason if decision.status == "rejected" else None
            }
        }
    )
    
    await db.verification_documents.update_many(
        {"provider_id": provider_id, "status": "pending"},
        {
            "$set": {
                "status": decision.status,
                "reviewed_at": datetime.now(timezone.utc),
                "reviewed_by": current_user.user_id
            }
        }
    )
    
    # Notify provider via email
    if RESEND_API_KEY:
        user = await db.users.find_one({"user_id": profile.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        if user and user.get("email"):
            approved = decision.status == "approved"
            subject = "Your Lumi\u00e8re profile is verified" if approved else "Your Lumi\u00e8re verification update"
            html = _verification_email_html(
                user.get("name") or profile.get("display_name") or "there",
                approved,
                decision.reason
            )
            try:
                await asyncio.to_thread(
                    resend.Emails.send,
                    {"from": f"Lumi\u00e8re <{SENDER_EMAIL}>", "to": [user["email"]],
                     "subject": subject, "html": html}
                )
            except Exception as e:
                logger.error(f"Resend verification email failed: {e}")
    
    return {"message": f"Verification {decision.status}"}

# ===== ADMIN HELPERS =====

async def get_admin_user(request: Request, session_token: Optional[str] = Cookie(None)) -> User:
    """Get current user and verify admin role"""
    user = await get_current_user(request, session_token)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ===== ADMIN ROUTES =====

@api_router.get("/admin/providers")
async def admin_get_providers(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get all providers for admin dashboard - pending actions first"""
    admin = await get_admin_user(request, session_token)
    
    # Get all providers with their user info
    providers = await db.provider_profiles.find({}, {"_id": 0}).to_list(1000)
    
    # Count pending media for each provider
    for provider in providers:
        pending_count = await db.provider_media.count_documents({
            "provider_id": provider["provider_id"],
            "status": "pending"
        })
        provider["pending_media_count"] = pending_count
        provider["needs_action"] = pending_count > 0
        
        # Get user info
        user = await db.users.find_one(
            {"user_id": provider["user_id"]},
            {"_id": 0, "password_hash": 0}
        )
        provider["user"] = user
        
        # Convert datetime to ISO string
        if "created_at" in provider and isinstance(provider["created_at"], datetime):
            provider["created_at"] = provider["created_at"].isoformat()
    
    # Sort: needs_action first, then by created_at descending
    providers.sort(key=lambda x: (not x.get("needs_action", False), x.get("created_at", "")), reverse=False)
    
    return providers

@api_router.get("/admin/providers/{provider_id}")
async def admin_get_provider_detail(
    provider_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get detailed provider info for admin including all media"""
    admin = await get_admin_user(request, session_token)
    
    provider = await db.provider_profiles.find_one(
        {"provider_id": provider_id},
        {"_id": 0}
    )
    
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # Get user info
    user = await db.users.find_one(
        {"user_id": provider["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    provider["user"] = user
    
    # Get all media
    media = await db.provider_media.find(
        {"provider_id": provider_id},
        {"_id": 0}
    ).sort("uploaded_at", -1).to_list(100)
    
    # Convert datetime fields
    for item in media:
        if "uploaded_at" in item and isinstance(item["uploaded_at"], datetime):
            item["uploaded_at"] = item["uploaded_at"].isoformat()
        if "reviewed_at" in item and isinstance(item["reviewed_at"], datetime):
            item["reviewed_at"] = item["reviewed_at"].isoformat()
    
    provider["media"] = media
    
    # Convert provider datetime
    if "created_at" in provider and isinstance(provider["created_at"], datetime):
        provider["created_at"] = provider["created_at"].isoformat()
    
    return provider

@api_router.put("/admin/media/{media_id}/approve")
async def admin_approve_media(
    media_id: str,
    approval: MediaApproval,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Approve or reject provider media"""
    admin = await get_admin_user(request, session_token)
    
    media = await db.provider_media.find_one({"media_id": media_id})
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Update media status
    update_data = {
        "status": approval.status,
        "reviewed_at": datetime.now(timezone.utc),
        "reviewed_by": admin.user_id
    }
    
    if approval.reason:
        update_data["rejection_reason"] = approval.reason
    
    await db.provider_media.update_one(
        {"media_id": media_id},
        {"$set": update_data}
    )
    
    # If approved, add photos to the profile's photo list (approved videos are read from provider_media)
    if approval.status == "approved" and media.get("media_type", "photo") == "photo":
        await db.provider_profiles.update_one(
            {"provider_id": media["provider_id"]},
            {"$addToSet": {"photos": media["url"]}}
        )
    # If rejected, remove from photos array if it exists
    elif approval.status == "rejected":
        await db.provider_profiles.update_one(
            {"provider_id": media["provider_id"]},
            {"$pull": {"photos": media["url"]}}
        )
    
    return {"status": "success", "media_id": media_id, "new_status": approval.status}

@api_router.get("/admin/stats")
async def admin_get_stats(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Get admin dashboard statistics"""
    admin = await get_admin_user(request, session_token)
    
    # Get counts
    total_providers = await db.provider_profiles.count_documents({})
    total_clients = await db.users.count_documents({"role": "client"})
    pending_media = await db.provider_media.count_documents({"status": "pending"})
    
    # Get providers needing action (single query — count distinct providers with pending media)
    provider_ids = [p["provider_id"] for p in await db.provider_profiles.find({}, {"_id": 0, "provider_id": 1}).to_list(1000)]
    providers_with_pending = await db.provider_media.distinct(
        "provider_id", {"provider_id": {"$in": provider_ids}, "status": "pending"}
    )
    providers_needing_action = len(providers_with_pending)
    
    return {
        "total_providers": total_providers,
        "total_clients": total_clients,
        "pending_media": pending_media,
        "providers_needing_action": providers_needing_action
    }

@api_router.get("/admin/traffic")
async def admin_get_traffic(
    request: Request,
    days: int = 7,
    session_token: Optional[str] = Cookie(None)
):
    """Get website traffic statistics"""
    admin = await get_admin_user(request, session_token)
    
    # Get traffic for last N days
    start_date = datetime.now(timezone.utc) - timedelta(days=days)
    
    traffic_logs = await db.traffic_logs.find(
        {"timestamp": {"$gte": start_date}},
        {"_id": 0}
    ).to_list(10000)
    
    # Aggregate by day and page
    daily_stats = {}
    page_stats = {}
    unique_visitors = set()
    
    for log in traffic_logs:
        # Daily aggregation
        day = log["timestamp"].strftime("%Y-%m-%d") if isinstance(log["timestamp"], datetime) else log["timestamp"][:10]
        if day not in daily_stats:
            daily_stats[day] = {"views": 0, "unique_visitors": set()}
        daily_stats[day]["views"] += 1
        if log.get("ip_address"):
            daily_stats[day]["unique_visitors"].add(log["ip_address"])
            unique_visitors.add(log["ip_address"])
        
        # Page aggregation
        page = log.get("page", "unknown")
        if page not in page_stats:
            page_stats[page] = 0
        page_stats[page] += 1
    
    # Convert sets to counts
    daily_data = []
    for day, stats in sorted(daily_stats.items()):
        daily_data.append({
            "date": day,
            "views": stats["views"],
            "unique_visitors": len(stats["unique_visitors"])
        })
    
    return {
        "period_days": days,
        "total_views": len(traffic_logs),
        "total_unique_visitors": len(unique_visitors),
        "daily_stats": daily_data,
        "page_stats": dict(sorted(page_stats.items(), key=lambda x: x[1], reverse=True)[:10])
    }

@api_router.post("/track")
async def track_page_view(request: Request):
    """Track a page view"""
    body = await request.json()
    
    log_doc = {
        "log_id": f"log_{uuid.uuid4().hex[:12]}",
        "page": body.get("page", "/"),
        "user_id": body.get("user_id"),
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "timestamp": datetime.now(timezone.utc)
    }
    
    await db.traffic_logs.insert_one(log_doc)
    return {"status": "tracked"}

@api_router.post("/admin/providers/{provider_id}/verify")
async def admin_verify_provider(
    provider_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Verify or unverify a provider"""
    admin = await get_admin_user(request, session_token)
    body = await request.json()
    
    verified = body.get("verified", False)
    
    result = await db.provider_profiles.update_one(
        {"provider_id": provider_id},
        {"$set": {
            "verified": verified,
            "verification_status": "approved" if verified else "pending"
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return {"status": "success", "verified": verified}

# ===== ADMIN: AGENCY MANAGEMENT =====

@api_router.get("/admin/agencies")
async def admin_list_agencies(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """List every agency with roster stats (admin only)."""
    admin = await get_admin_user(request, session_token)
    now = datetime.utcnow()
    agencies = await db.agency_profiles.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    result = []
    for ag in agencies:
        uid = ag.get("user_id")
        profiles = await db.provider_profiles.find({"user_id": uid}, {"_id": 0}).to_list(1000)
        total = len(profiles)
        live = sum(
            1 for p in profiles
            if not p.get("suspended")
            and p.get("verified")
            and p.get("available")
            and p.get("featured_until") and p["featured_until"] > now - timedelta(days=GRACE_DAYS)
        )
        user = await db.users.find_one({"user_id": uid}, {"_id": 0, "password_hash": 0})
        result.append({
            "agency_id": ag.get("agency_id"),
            "user_id": uid,
            "agency_name": ag.get("agency_name") or "Untitled agency",
            "location": ag.get("location") or {},
            "contact": ag.get("contact") or {},
            "suspended": bool(ag.get("suspended")),
            "total_profiles": total,
            "live_profiles": live,
            "email": (user or {}).get("email"),
            "name": (user or {}).get("name"),
            "created_at": ag["created_at"].isoformat() if isinstance(ag.get("created_at"), datetime) else ag.get("created_at"),
        })
    return result

@api_router.get("/admin/agencies/{agency_user_id}")
async def admin_get_agency_detail(
    agency_user_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Agency detail + companion roster (admin only)."""
    admin = await get_admin_user(request, session_token)
    now = datetime.utcnow()
    ag = await db.agency_profiles.find_one({"user_id": agency_user_id}, {"_id": 0})
    if not ag:
        raise HTTPException(status_code=404, detail="Agency not found")
    user = await db.users.find_one({"user_id": agency_user_id}, {"_id": 0, "password_hash": 0})
    profiles = await db.provider_profiles.find({"user_id": agency_user_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    roster = []
    for p in profiles:
        fu = p.get("featured_until")
        roster.append({
            "provider_id": p["provider_id"],
            "display_name": p.get("display_name") or "Untitled profile",
            "location": p.get("location") or {},
            "verified": p.get("verified", False),
            "suspended": bool(p.get("suspended")),
            "live": bool(not p.get("suspended") and p.get("verified") and p.get("available") and fu and fu > now - timedelta(days=GRACE_DAYS)),
            "photos": p.get("photos") or [],
        })
    return {
        "agency_id": ag.get("agency_id"),
        "user_id": agency_user_id,
        "agency_name": ag.get("agency_name") or "Untitled agency",
        "description": ag.get("description"),
        "location": ag.get("location") or {},
        "contact": ag.get("contact") or {},
        "languages": ag.get("languages") or [],
        "suspended": bool(ag.get("suspended")),
        "user": user,
        "created_at": ag["created_at"].isoformat() if isinstance(ag.get("created_at"), datetime) else ag.get("created_at"),
        "profiles": roster,
    }

@api_router.post("/admin/agencies/{agency_user_id}/suspend")
async def admin_suspend_agency(
    agency_user_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Suspend or unsuspend an agency and all its profiles (admin only)."""
    admin = await get_admin_user(request, session_token)
    body = await request.json()
    suspend = bool(body.get("suspend", True))
    ag = await db.agency_profiles.find_one({"user_id": agency_user_id})
    if not ag:
        raise HTTPException(status_code=404, detail="Agency not found")
    await db.agency_profiles.update_one({"user_id": agency_user_id}, {"$set": {"suspended": suspend}})
    await db.provider_profiles.update_many({"user_id": agency_user_id}, {"$set": {"suspended": suspend}})
    return {"status": "success", "suspended": suspend}

@api_router.delete("/admin/agencies/{agency_user_id}")
async def admin_delete_agency(
    agency_user_id: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Delete an agency, all its companion profiles and related data (admin only)."""
    admin = await get_admin_user(request, session_token)
    ag = await db.agency_profiles.find_one({"user_id": agency_user_id})
    if not ag:
        raise HTTPException(status_code=404, detail="Agency not found")
    profiles = await db.provider_profiles.find({"user_id": agency_user_id}, {"_id": 0, "provider_id": 1}).to_list(1000)
    provider_ids = [p["provider_id"] for p in profiles]
    if provider_ids:
        await db.provider_media.delete_many({"provider_id": {"$in": provider_ids}})
        await db.enquiries.delete_many({"provider_id": {"$in": provider_ids}})
        await db.subscriptions.delete_many({"provider_id": {"$in": provider_ids}})
    await db.provider_profiles.delete_many({"user_id": agency_user_id})
    await db.agency_profiles.delete_one({"user_id": agency_user_id})
    await db.users.delete_one({"user_id": agency_user_id})
    return {"status": "success", "deleted_profiles": len(provider_ids)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def start_background_jobs():
    # Mark all pre-existing accounts (incl. seeded admin/agency/demo) as verified so nothing breaks
    await db.users.update_many({"email_verified": {"$exists": False}}, {"$set": {"email_verified": True}})
    await db.email_verification_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.email_verification_tokens.create_index("token")
    asyncio.create_task(_renewal_notice_loop())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
