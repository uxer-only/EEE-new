from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
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
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

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
    created_at: datetime

class ProviderProfileCreate(BaseModel):
    display_name: str
    account_type: Optional[str] = "independent"
    availability_type: Optional[str] = "both"
    booking_advance: Optional[bool] = False
    available247: Optional[bool] = False
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

class ProviderProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    account_type: Optional[str] = None
    availability_type: Optional[str] = None
    booking_advance: Optional[bool] = None
    available247: Optional[bool] = None
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
async def register(user_data: UserRegister):
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
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.insert_one(user_doc)
    
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
        "account_type": user_doc["account_type"]
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
        "account_type": user_doc.get("account_type")
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

def _add_numeric_range_expr(query: dict, field_path: str, min_val, max_val):
    """Add a $expr range condition that safely handles values stored as either
    numbers or numeric strings (legacy characteristics)."""
    if min_val is None and max_val is None:
        return
    conds = [
        {"$ne": [f"${field_path}", None]},
        {"$ne": [f"${field_path}", ""]},
    ]
    if min_val is not None:
        conds.append({"$gte": [{"$toDouble": f"${field_path}"}, float(min_val)]})
    if max_val is not None:
        conds.append({"$lte": [{"$toDouble": f"${field_path}"}, float(max_val)]})
    clause = {"$expr": {"$and": conds}}
    query.setdefault("$and", []).append(clause)


# ===== SUBSCRIPTIONS / PAYMENTS =====
# Server-side allowlist — never trust client for amounts.
PLANS = {
    "featured_2w": {"label": "Featured · 2 weeks", "amount": 30.00, "duration_days": 14, "kind": "featured"},
    "featured_4w": {"label": "Featured · 4 weeks", "amount": 55.00, "duration_days": 28, "kind": "featured"},
    "vip_2w":      {"label": "VIP Boost · 2 weeks", "amount": 15.00, "duration_days": 14, "kind": "vip"},
    "vip_4w":      {"label": "VIP Boost · 4 weeks", "amount": 25.00, "duration_days": 28, "kind": "vip"},
}
CURRENCY = "eur"


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


async def _activate_subscription_for_session(session_id: str) -> Optional[dict]:
    """Idempotent: read the pending tx, apply Featured + VIP duration to provider profile.
    Returns the updated tx or None if already processed / not found."""
    tx = await db.payment_transactions.find_one({"session_id": session_id})
    if not tx:
        return None
    if tx.get("status") == "complete":
        return tx  # already processed — short-circuit
    if tx.get("payment_status") != "paid":
        return tx  # not paid yet

    profile = await db.provider_profiles.find_one({"provider_id": tx["provider_id"]})
    if not profile:
        return tx

    now = datetime.utcnow()  # naive UTC for comparisons against Mongo dates
    set_fields: Dict[str, Any] = {}

    feat = PLANS.get(tx.get("featured_plan") or "")
    if feat:
        # Extend from existing future expiry if any, else from now
        current = profile.get("featured_until")
        base = current if (current and current > now) else now
        set_fields["featured_until"] = base + timedelta(days=feat["duration_days"])

    vip_key = tx.get("vip_plan")
    if vip_key:
        vip_plan = PLANS.get(vip_key)
        if vip_plan:
            current = profile.get("vip_until")
            base = current if (current and current > now) else now
            set_fields["vip_until"] = base + timedelta(days=vip_plan["duration_days"])

    if set_fields:
        await db.provider_profiles.update_one(
            {"provider_id": tx["provider_id"]}, {"$set": set_fields}
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
    return {
        "session_id": session_id,
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

    return {
        "has_profile": True,
        "featured_active": bool(featured_until and featured_until > now),
        "featured_until": featured_until.isoformat() if featured_until else None,
        "featured_days_left": _days_left(featured_until),
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
    if not latest_sub:
        raise HTTPException(status_code=404, detail="No subscription found")
    await db.subscriptions.update_one(
        {"_id": latest_sub["_id"]},
        {"$set": {"auto_renew": body.auto_renew}},
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
            row["created_at"] = ts.isoformat()
        items.append(row)
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

    provider_name = current_user.name or "Elite Escorts Europe"
    provider_email = current_user.email
    subject = f"Re: your enquiry on Elite Escorts Europe"
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
                "reply_to": [provider_email],
            }
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
        line_parts.append(f"VIP Boost · {meta['vip_id']}")
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


@api_router.get("/providers")
async def browse_providers(
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
):
    """Browse and search providers"""
    query: dict = {"verified": True, "available": True}

    if city:
        query["location.city"] = {"$regex": city, "$options": "i"}

    if service:
        query["services"] = service

    if min_rate is not None or max_rate is not None:
        rate_query = {}
        if min_rate is not None:
            rate_query["$gte"] = min_rate
        if max_rate is not None:
            rate_query["$lte"] = max_rate
        # Support both nested (rates.incall.1hour) and legacy flat (rates.1hour) docs
        query["$or"] = [
            {"rates.incall.1hour": rate_query},
            {"rates.1hour": rate_query},
        ]

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

    # Subscription gate: only providers with an active Featured plan are visible.
    # Mongo returns naive datetimes — compare in naive UTC.
    now = datetime.utcnow()
    query["featured_until"] = {"$gt": now}

    profiles = await db.provider_profiles.find(query, {"_id": 0}).to_list(200)

    # Annotate vip_active for the frontend + sort VIP first, newest VIP first.
    for p in profiles:
        vu = p.get("vip_until")
        p["vip_active"] = bool(vu and vu > now)
    profiles.sort(
        key=lambda p: (
            0 if p["vip_active"] else 1,                 # VIPs first
            -(p.get("vip_until").timestamp() if p.get("vip_until") else 0),
            -(p.get("created_at").timestamp() if p.get("created_at") else 0),
        )
    )

    # Add user info
    for profile in profiles:
        user = await db.users.find_one(
            {"user_id": profile["user_id"]},
            {"_id": 0, "name": 1, "picture": 1}
        )
        profile["user"] = user

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
        {"_id": 0, "name": 1, "picture": 1, "email": 1}
    )
    profile["user"] = user

    # Annotate active subscription flags for the frontend (Mongo dates are naive UTC)
    now = datetime.utcnow()
    profile["featured_active"] = bool(profile.get("featured_until") and profile["featured_until"] > now)
    profile["vip_active"] = bool(profile.get("vip_until") and profile["vip_until"] > now)

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
        # count unread enquiries for this profile
        unread = await db.enquiries.count_documents(
            {"provider_id": p["provider_id"], "read": False}
        )
        profiles.append({
            "provider_id": p["provider_id"],
            "display_name": p.get("display_name") or "Untitled profile",
            "bio": p.get("bio") or p.get("essence") or "",
            "location": p.get("location") or {},
            "verification_status": p.get("verification_status", "pending"),
            "verified": p.get("verified", False),
            "featured_active": bool(featured_until and featured_until > now),
            "unread_enquiries": unread,
        })
    return {"profiles": profiles, "account_type": current_user.account_type}


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
    
    # If approved, add to provider's photos array
    if approval.status == "approved":
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
    
    # Get providers needing action
    providers_needing_action = 0
    providers = await db.provider_profiles.find({}, {"provider_id": 1}).to_list(1000)
    for p in providers:
        count = await db.provider_media.count_documents({
            "provider_id": p["provider_id"],
            "status": "pending"
        })
        if count > 0:
            providers_needing_action += 1
    
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
