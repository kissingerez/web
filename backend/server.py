"""FastAPI server for the ad-free video web app (weclips-style).

Features: email/password JWT auth, Cloudinary video uploads, follow system,
Stripe $0.99/month-equivalent paywall (one-time $0.99 grants 30 days premium
via Emergent Stripe proxy).
"""
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, ConfigDict

import cloudinary
import cloudinary.uploader

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user_id,
    get_optional_user_id,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- DB ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Cloudinary ---
cloudinary.config(
    cloud_name=os.environ['CLOUDINARY_CLOUD_NAME'],
    api_key=os.environ['CLOUDINARY_API_KEY'],
    api_secret=os.environ['CLOUDINARY_API_SECRET'],
    secure=True,
)

# --- Stripe (via Emergent proxy with test key) ---
STRIPE_API_KEY = os.environ['STRIPE_API_KEY']
SUBSCRIPTION_AMOUNT = float(os.environ.get('SUBSCRIPTION_AMOUNT_CENTS', '99')) / 100.0  # $0.99
SUBSCRIPTION_CURRENCY = os.environ.get('SUBSCRIPTION_CURRENCY', 'usd')
PREMIUM_DURATION_DAYS = 30

# --- Constants ---
MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024  # 2 GB
ALLOWED_VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-matroska"}

# ============================================================
# Models
# ============================================================

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    username: str = Field(min_length=2, max_length=30)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=128)


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    username: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: str
    is_premium: bool = False
    premium_until: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class VideoPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    url: str
    thumbnail_url: Optional[str] = None
    public_id: str
    duration: Optional[float] = None
    owner_id: str
    owner_username: Optional[str] = None
    owner_avatar: Optional[str] = None
    views: int = 0
    likes: int = 0
    created_at: str


class VideoUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class CheckoutCreateRequest(BaseModel):
    origin_url: str  # frontend origin, e.g. https://app.com


class CheckoutCreateResponse(BaseModel):
    url: str
    session_id: str


class CheckoutStatusResponse(BaseModel):
    status: str
    payment_status: str
    amount_total: int
    currency: str
    is_premium: bool
    premium_until: Optional[str] = None


# ============================================================
# Helpers — mobile-app compatibility layer
# ============================================================
def _doc_id(doc: dict) -> str:
    """Get document id, supporting both web ('id') and mobile ('_id') schemas."""
    return doc.get("id") or doc.get("_id") or ""


def _to_iso(v) -> Optional[str]:
    """Normalize datetime|str|None into ISO-8601 string."""
    if v is None:
        return None
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return str(v)


def _parse_dt(v) -> Optional[datetime]:
    """Parse datetime|str into timezone-aware datetime."""
    if v is None:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def _is_premium(user_doc: dict) -> bool:
    """Premium if EITHER web's premium_until is in the future
    OR mobile's is_subscribed=True (with subscription_expires_at in future, or 'active' status)."""
    now = datetime.now(timezone.utc)

    web_until = _parse_dt(user_doc.get("premium_until"))
    if web_until and web_until > now:
        return True

    # Mobile schema
    if user_doc.get("is_subscribed") is True:
        exp = _parse_dt(user_doc.get("subscription_expires_at"))
        if exp is None or exp > now:
            return True
        # status overrides if RC says active
        status_val = (user_doc.get("subscription_status") or "").lower()
        if status_val in ("active", "trialing"):
            return True

    return False


async def _premium_until_iso(user_doc: dict) -> Optional[str]:
    """Pick the latest expiry between web & mobile fields."""
    web_until = _parse_dt(user_doc.get("premium_until"))
    mob_until = _parse_dt(user_doc.get("subscription_expires_at"))
    candidates = [d for d in (web_until, mob_until) if d is not None]
    if not candidates:
        # Subscribed but no expiry → return mobile status as a fallback
        if user_doc.get("is_subscribed"):
            return "active"
        return None
    return max(candidates).isoformat()


async def _user_public(user_doc: dict, viewer_id: Optional[str] = None) -> dict:
    is_premium = await _is_premium(user_doc)
    return {
        "id": _doc_id(user_doc),
        "email": user_doc["email"],
        "username": user_doc.get("username") or user_doc.get("display_name") or "",
        "avatar_url": user_doc.get("avatar_url"),
        "bio": user_doc.get("bio"),
        "created_at": _to_iso(user_doc.get("created_at")) or now_iso(),
        "is_premium": is_premium,
        "premium_until": await _premium_until_iso(user_doc),
        "followers_count": user_doc.get("followers_count", 0),
        "following_count": user_doc.get("following_count", 0),
    }


async def _find_user_by_id(uid: str) -> Optional[dict]:
    """Find user by either web 'id' or mobile '_id'."""
    return await db.users.find_one({"$or": [{"id": uid}, {"_id": uid}]})


async def _video_public(v: dict) -> dict:
    """Map a video doc to public shape. Supports both web & mobile schemas."""
    owner_id = v.get("owner_id") or v.get("user_id") or v.get("uploader_id") or ""
    url = v.get("url") or v.get("stream_url") or v.get("video_url") or ""
    thumb = v.get("thumbnail_url") or v.get("thumbnail") or v.get("poster_url")
    return {
        "id": _doc_id(v),
        "title": v.get("title") or "Untitled",
        "description": v.get("description"),
        "url": url,
        "thumbnail_url": thumb,
        "public_id": v.get("public_id") or v.get("object_key") or _doc_id(v),
        "duration": v.get("duration") or v.get("duration_seconds"),
        "owner_id": owner_id,
        "owner_username": v.get("owner_username") or v.get("username"),
        "owner_avatar": v.get("owner_avatar") or v.get("avatar_url"),
        "views": v.get("views") or v.get("view_count") or 0,
        "likes": v.get("likes") or v.get("like_count") or 0,
        "created_at": _to_iso(v.get("created_at")) or now_iso(),
    }


# ============================================================
# App
# ============================================================
app = FastAPI(title="Slate Video API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "Slate Video API up", "ts": now_iso()}


# ============================================================
# Auth routes
# ============================================================
@api_router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    email = req.email.lower().strip()
    existing = await db.users.find_one({"$or": [{"email": email}, {"username": req.username}]})
    if existing:
        if existing.get("email") == email:
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail="Username already taken")

    user_id = str(uuid.uuid4())
    doc = {
        "_id": user_id,          # mobile-compat: mobile uses _id as UUID
        "id": user_id,           # web schema field
        "email": email,
        "username": req.username.strip(),
        "display_name": req.username.strip(),  # mobile-compat
        "password_hash": hash_password(req.password),
        "avatar_url": None,
        "bio": None,
        "created_at": now_iso(),
        "premium_until": None,
        "is_subscribed": False,         # mobile-compat
        "subscription_status": "none",  # mobile-compat
        "subscription_expires_at": None,
        "followers_count": 0,
        "following_count": 0,
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id)
    return AuthResponse(token=token, user=UserPublic(**await _user_public(doc)))


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(_doc_id(user))
    return AuthResponse(token=token, user=UserPublic(**await _user_public(user)))


@api_router.get("/auth/me", response_model=UserPublic)
async def me(user_id: str = Depends(get_current_user_id)):
    user = await _find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(**await _user_public(user))


# ---- Password reset (matches mobile app contract) ----
import secrets as _secrets


def _frontend_origin(request: Request) -> str:
    origin = request.headers.get("origin") or request.headers.get("referer")
    if origin:
        # strip path
        from urllib.parse import urlparse
        u = urlparse(origin)
        return f"{u.scheme}://{u.netloc}"
    return ""


@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})

    # Always return the same response to avoid email enumeration
    response = {"status": "ok"}

    if user:
        token = _secrets.token_urlsafe(32)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": _doc_id(user),
            "email": email,
            "expires_at": expires_at,
            "created_at": now_iso(),
            "used": False,
        })
        # No email service configured yet → return dev_reset_url so the user can complete the flow
        origin = _frontend_origin(request)
        if origin:
            response["dev_reset_url"] = f"{origin}/reset?token={token}"
        else:
            response["dev_reset_url"] = f"/reset?token={token}"

    return response


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    rec = await db.password_reset_tokens.find_one({"token": req.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    try:
        exp = datetime.fromisoformat(rec["expires_at"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token")
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")

    user = await _find_user_by_id(rec["user_id"])
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(req.new_password)}},
    )
    await db.password_reset_tokens.update_one(
        {"token": req.token},
        {"$set": {"used": True, "used_at": now_iso()}},
    )
    return {"status": "ok"}


# ============================================================
# Users / Follow
# ============================================================
class UserProfileResponse(BaseModel):
    user: UserPublic
    is_following: bool = False
    videos: List[VideoPublic] = []


async def _find_user_by_username(username: str) -> Optional[dict]:
    """Lookup by username (web) or display_name (mobile fallback)."""
    return await db.users.find_one({"$or": [{"username": username}, {"display_name": username}]})


@api_router.get("/users/{username}", response_model=UserProfileResponse)
async def get_user_profile(username: str, viewer_id: Optional[str] = Depends(get_optional_user_id)):
    user = await _find_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    uid = _doc_id(user)
    is_following = False
    if viewer_id and viewer_id != uid:
        f = await db.follows.find_one({"follower_id": viewer_id, "following_id": uid})
        is_following = bool(f)

    vids = await db.videos.find(
        {"$or": [{"owner_id": uid}, {"user_id": uid}, {"uploader_id": uid}]}
    ).sort("created_at", -1).to_list(200)
    return UserProfileResponse(
        user=UserPublic(**await _user_public(user)),
        is_following=is_following,
        videos=[VideoPublic(**await _video_public(v)) for v in vids],
    )


@api_router.get("/users", response_model=List[UserPublic])
async def list_users(limit: int = 50):
    users = await db.users.find({}).sort("created_at", -1).to_list(limit)
    return [UserPublic(**await _user_public(u)) for u in users]


@api_router.post("/users/{username}/follow")
async def follow_user(username: str, user_id: str = Depends(get_current_user_id)):
    target = await _find_user_by_username(username)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    tid = _doc_id(target)
    if tid == user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    existing = await db.follows.find_one({"follower_id": user_id, "following_id": tid})
    if existing:
        return {"following": True}
    await db.follows.insert_one({
        "follower_id": user_id,
        "following_id": tid,
        "created_at": now_iso(),
    })
    await db.users.update_one({"$or": [{"id": tid}, {"_id": tid}]}, {"$inc": {"followers_count": 1}})
    await db.users.update_one({"$or": [{"id": user_id}, {"_id": user_id}]}, {"$inc": {"following_count": 1}})
    return {"following": True}


@api_router.delete("/users/{username}/follow")
async def unfollow_user(username: str, user_id: str = Depends(get_current_user_id)):
    target = await _find_user_by_username(username)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    tid = _doc_id(target)
    res = await db.follows.delete_one({"follower_id": user_id, "following_id": tid})
    if res.deleted_count:
        await db.users.update_one({"$or": [{"id": tid}, {"_id": tid}]}, {"$inc": {"followers_count": -1}})
        await db.users.update_one({"$or": [{"id": user_id}, {"_id": user_id}]}, {"$inc": {"following_count": -1}})
    return {"following": False}


# ============================================================
# Videos
# ============================================================
async def _require_premium(user_id: str) -> dict:
    user = await _find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not await _is_premium(user):
        raise HTTPException(status_code=402, detail="Premium subscription required")
    return user


@api_router.post("/videos/upload", response_model=VideoPublic)
async def upload_video(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    user = await _require_premium(user_id)

    if file.content_type not in ALLOWED_VIDEO_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported video format: {file.content_type}")

    contents = await file.read()
    if len(contents) > MAX_VIDEO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Video exceeds 100MB limit")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        upload_res = cloudinary.uploader.upload_large(
            contents,
            resource_type="video",
            folder="slate_videos",
            chunk_size=6_000_000,
        )
    except Exception as e:
        logger.exception("Cloudinary upload failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")

    video_id = str(uuid.uuid4())
    public_id = upload_res.get("public_id")
    secure_url = upload_res.get("secure_url")
    # Cloudinary thumbnail: replace .mp4 with .jpg, also use eager-style URL
    thumbnail_url = None
    if public_id:
        thumbnail_url = f"https://res.cloudinary.com/{os.environ['CLOUDINARY_CLOUD_NAME']}/video/upload/so_2,w_640,h_360,c_fill,q_auto,f_jpg/{public_id}.jpg"

    doc = {
        "id": video_id,
        "title": title.strip()[:200],
        "description": (description or "").strip()[:2000] or None,
        "url": secure_url,
        "thumbnail_url": thumbnail_url,
        "public_id": public_id,
        "duration": upload_res.get("duration"),
        "owner_id": user_id,
        "owner_username": user["username"],
        "owner_avatar": user.get("avatar_url"),
        "views": 0,
        "likes": 0,
        "created_at": now_iso(),
    }
    await db.videos.insert_one(doc)
    return VideoPublic(**await _video_public(doc))


@api_router.get("/videos", response_model=List[VideoPublic])
async def list_videos(limit: int = 50, skip: int = 0):
    vids = await db.videos.find({}).sort("created_at", -1).skip(skip).to_list(limit)
    return [VideoPublic(**await _video_public(v)) for v in vids]


@api_router.get("/videos/following", response_model=List[VideoPublic])
async def list_following_videos(limit: int = 50, user_id: str = Depends(get_current_user_id)):
    follows = await db.follows.find({"follower_id": user_id}).to_list(1000)
    following_ids = [f["following_id"] for f in follows]
    if not following_ids:
        return []
    vids = await db.videos.find(
        {"$or": [
            {"owner_id": {"$in": following_ids}},
            {"user_id": {"$in": following_ids}},
            {"uploader_id": {"$in": following_ids}},
        ]}
    ).sort("created_at", -1).to_list(limit)
    return [VideoPublic(**await _video_public(v)) for v in vids]


@api_router.get("/videos/{video_id}", response_model=VideoPublic)
async def get_video(video_id: str, viewer_id: Optional[str] = Depends(get_optional_user_id)):
    v = await db.videos.find_one({"$or": [{"id": video_id}, {"_id": video_id}]})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    # Paywall: only premium subscribers can watch
    if not viewer_id:
        raise HTTPException(status_code=401, detail="Login required")
    viewer = await _find_user_by_id(viewer_id)
    if not viewer or not await _is_premium(viewer):
        raise HTTPException(status_code=402, detail="Premium subscription required to watch")

    # increment views
    await db.videos.update_one({"$or": [{"id": video_id}, {"_id": video_id}]}, {"$inc": {"views": 1}})
    v["views"] = (v.get("views") or v.get("view_count") or 0) + 1
    return VideoPublic(**await _video_public(v))


@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, user_id: str = Depends(get_current_user_id)):
    v = await db.videos.find_one({"$or": [{"id": video_id}, {"_id": video_id}]})
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    owner_id = v.get("owner_id") or v.get("user_id") or v.get("uploader_id")
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not your video")
    try:
        if v.get("public_id"):
            cloudinary.uploader.destroy(v["public_id"], resource_type="video")
    except Exception:
        logger.warning("Cloudinary destroy failed for %s", v.get("public_id"))
    await db.videos.delete_one({"$or": [{"id": video_id}, {"_id": video_id}]})
    return {"deleted": True}


# ============================================================
# Stripe Payments (one-time $0.99 -> 30 days premium)
# ============================================================
def _get_stripe(host_url: str) -> StripeCheckout:
    webhook_url = f"{host_url}/api/payments/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api_router.post("/payments/checkout", response_model=CheckoutCreateResponse)
async def create_checkout(req: CheckoutCreateRequest, request: Request, user_id: str = Depends(get_current_user_id)):
    user = await _find_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Build absolute backend url for webhook
    host_url = str(request.base_url).rstrip("/")
    stripe_client = _get_stripe(host_url)

    success_url = f"{req.origin_url.rstrip('/')}/billing/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url.rstrip('/')}/billing/cancel"

    checkout_req = CheckoutSessionRequest(
        amount=SUBSCRIPTION_AMOUNT,
        currency=SUBSCRIPTION_CURRENCY,
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user_id,
            "plan": "monthly_premium",
            "duration_days": str(PREMIUM_DURATION_DAYS),
        },
    )
    try:
        res = await stripe_client.create_checkout_session(checkout_req)
    except Exception as e:
        logger.exception("Stripe checkout creation failed")
        raise HTTPException(status_code=500, detail=f"Checkout failed: {e}")

    # Record pending transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": res.session_id,
        "user_id": user_id,
        "amount": SUBSCRIPTION_AMOUNT,
        "currency": SUBSCRIPTION_CURRENCY,
        "payment_status": "pending",
        "created_at": now_iso(),
        "metadata": checkout_req.metadata,
    })
    return CheckoutCreateResponse(url=res.url, session_id=res.session_id)


@api_router.get("/payments/checkout/{session_id}", response_model=CheckoutStatusResponse)
async def get_checkout_status(session_id: str, request: Request, user_id: str = Depends(get_current_user_id)):
    host_url = str(request.base_url).rstrip("/")
    stripe_client = _get_stripe(host_url)

    try:
        s = await stripe_client.get_checkout_status(session_id)
    except Exception as e:
        logger.exception("Stripe status check failed")
        raise HTTPException(status_code=500, detail=f"Status fetch failed: {e}")

    txn = await db.payment_transactions.find_one({"session_id": session_id})
    already_processed = txn and txn.get("payment_status") == "paid"

    if s.payment_status == "paid" and not already_processed:
        # Grant 30 days premium
        user = await _find_user_by_id(user_id)
        if user:
            current_until_str = user.get("premium_until")
            base_dt = datetime.now(timezone.utc)
            if current_until_str:
                try:
                    cur_dt = datetime.fromisoformat(current_until_str)
                    if cur_dt > base_dt:
                        base_dt = cur_dt
                except Exception:
                    pass
            new_until = (base_dt + timedelta(days=PREMIUM_DURATION_DAYS)).isoformat()
            await db.users.update_one({"$or": [{"id": user_id}, {"_id": user_id}]}, {"$set": {"premium_until": new_until}})

        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "paid_at": now_iso()}},
        )

    user = await _find_user_by_id(user_id)
    return CheckoutStatusResponse(
        status=s.status,
        payment_status=s.payment_status,
        amount_total=int(s.amount_total or 0),
        currency=s.currency or SUBSCRIPTION_CURRENCY,
        is_premium=await _is_premium(user) if user else False,
        premium_until=user.get("premium_until") if user else None,
    )


@api_router.post("/payments/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    host_url = str(request.base_url).rstrip("/")
    stripe_client = _get_stripe(host_url)
    try:
        event = await stripe_client.handle_webhook(body, signature)
    except Exception as e:
        logger.warning("Webhook verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid webhook")

    if event.payment_status == "paid":
        txn = await db.payment_transactions.find_one({"session_id": event.session_id})
        if txn and txn.get("payment_status") != "paid":
            user_id = txn.get("user_id")
            user = await _find_user_by_id(user_id)
            if user:
                current_until_str = user.get("premium_until")
                base_dt = datetime.now(timezone.utc)
                if current_until_str:
                    try:
                        cur_dt = datetime.fromisoformat(current_until_str)
                        if cur_dt > base_dt:
                            base_dt = cur_dt
                    except Exception:
                        pass
                new_until = (base_dt + timedelta(days=PREMIUM_DURATION_DAYS)).isoformat()
                await db.users.update_one({"$or": [{"id": user_id}, {"_id": user_id}]}, {"$set": {"premium_until": new_until}})
            await db.payment_transactions.update_one(
                {"session_id": event.session_id},
                {"$set": {"payment_status": "paid", "paid_at": now_iso()}},
            )

    return {"ok": True}


# ============================================================
# App setup
# ============================================================
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    async def _ix(coro, label):
        try:
            await coro
        except Exception as e:
            # likely already created by the mobile backend with slightly different opts; safe to ignore
            logger.info("index %s already exists or skipped: %s", label, str(e)[:80])
    try:
        await _ix(db.users.create_index("email", unique=True), "users.email")
        await _ix(db.users.create_index("username", unique=True), "users.username")
        await _ix(db.videos.create_index([("created_at", -1)]), "videos.created_at")
        await _ix(db.videos.create_index("owner_id"), "videos.owner_id")
        await _ix(db.follows.create_index([("follower_id", 1), ("following_id", 1)], unique=True), "follows.compound")
        await _ix(db.payment_transactions.create_index("session_id", unique=True), "payment_transactions.session_id")
        await _ix(db.password_reset_tokens.create_index("token", unique=True), "password_reset_tokens.token")
        await _ix(db.password_reset_tokens.create_index("expires_at"), "password_reset_tokens.expires_at")
        logger.info("Indexes ensured.")
    except Exception as e:
        logger.warning("Skipping index creation; DB unreachable: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
