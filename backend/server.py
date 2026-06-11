"""FastAPI proxy server for the WeClips web app.

Forwards most requests to the mobile/canonical backend at MOBILE_BACKEND_URL,
translating shapes so the existing web React frontend continues to work.

Stripe checkout stays local; on success we call the mobile backend's
/api/subscription/dev-activate to grant subscription in the mobile DB.
"""
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Any

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout,
    CheckoutSessionRequest,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

MOBILE_BACKEND_URL = os.environ.get("MOBILE_BACKEND_URL", "https://ad-free-video-12.emergent.host").rstrip("/")
STRIPE_API_KEY = os.environ["STRIPE_API_KEY"]
SUBSCRIPTION_AMOUNT = float(os.environ.get("SUBSCRIPTION_AMOUNT_CENTS", "99")) / 100.0
SUBSCRIPTION_CURRENCY = os.environ.get("SUBSCRIPTION_CURRENCY", "usd")

# Local Mongo used only for Stripe payment_transactions records
mongo_url = os.environ["MONGO_URL"]
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ["DB_NAME"]]

bearer = HTTPBearer(auto_error=False)

# Reusable async client
_http: Optional[httpx.AsyncClient] = None


def http_client() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(base_url=MOBILE_BACKEND_URL, timeout=httpx.Timeout(120.0, connect=10.0))
    return _http


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ============================================================
# Helpers — forward request to mobile backend
# ============================================================
def _auth_header(creds: Optional[HTTPAuthorizationCredentials]) -> dict:
    if creds and creds.credentials:
        return {"Authorization": f"Bearer {creds.credentials}"}
    return {}


async def _proxy_json(method: str, path: str, *, creds=None, json_body=None, params=None) -> Any:
    headers = _auth_header(creds)
    r = await http_client().request(method, path, headers=headers, json=json_body, params=params)
    if r.status_code >= 400:
        try:
            body = r.json()
        except Exception:
            body = {"detail": r.text[:300] or r.reason_phrase}
        raise HTTPException(status_code=r.status_code, detail=body.get("detail", body))
    if r.status_code == 204 or not r.content:
        return {}
    return r.json()


# ============================================================
# Mobile→Web shape translation
# ============================================================
def mobile_user_to_web(u: dict) -> dict:
    if not u:
        return {}
    uid = u.get("id") or ""
    return {
        "id": uid,
        "email": u.get("email", ""),
        "username": u.get("username") or u.get("display_name") or "",
        "display_name": u.get("display_name"),
        "avatar_url": f"{MOBILE_BACKEND_URL}/api/users/{uid}/avatar" if u.get("has_avatar") else None,
        "bio": u.get("bio"),
        "created_at": u.get("created_at") or now_iso(),
        "is_premium": bool(u.get("is_subscribed")),
        "premium_until": u.get("current_period_end") or u.get("subscription_expires_at"),
        "followers_count": u.get("followers", 0),
        "following_count": u.get("following", 0),
    }


def mobile_video_to_web(v: dict) -> dict:
    if not v:
        return {}
    vid = v.get("id") or ""
    creator_id = v.get("creator_id") or ""
    return {
        "id": vid,
        "title": v.get("title") or "Untitled",
        "description": v.get("description"),
        # `url` is filled by /api/videos/{id} endpoint via stream-url; in listings keep empty so paywall logic on watch page kicks in
        "url": "",
        "thumbnail_url": f"{MOBILE_BACKEND_URL}/api/videos/{vid}/thumbnail" if v.get("has_thumbnail") else None,
        "public_id": vid,
        "duration": v.get("duration_sec"),
        "owner_id": creator_id,
        "owner_username": v.get("creator_username") or v.get("creator_name"),
        "owner_avatar": f"{MOBILE_BACKEND_URL}/api/users/{creator_id}/avatar" if creator_id else None,
        "views": v.get("views", 0),
        "likes": v.get("likes", 0),
        "created_at": v.get("created_at") or now_iso(),
    }


# ============================================================
# Pydantic request models (matching the web frontend)
# ============================================================
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


class CheckoutCreateRequest(BaseModel):
    origin_url: str


# ============================================================
# App + router
# ============================================================
app = FastAPI(title="WeClips Web (proxy)")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "WeClips web proxy up", "ts": now_iso(), "upstream": MOBILE_BACKEND_URL}


# ============================================================
# Auth (proxied)
# ============================================================
@api_router.post("/auth/signup")
async def signup(req: SignupRequest):
    """Forward to mobile. Mobile requires display_name. We use the username as display_name too."""
    payload = {
        "email": req.email.lower().strip(),
        "password": req.password,
        "display_name": req.username.strip()[:40],
        "username": req.username.strip()[:20],
    }
    data = await _proxy_json("POST", "/api/auth/signup", json_body=payload)
    token = data.get("access_token") or data.get("token")
    if not token:
        raise HTTPException(status_code=500, detail="No token returned from upstream")
    me = await _proxy_json("GET", "/api/auth/me", creds=HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    return {"token": token, "user": mobile_user_to_web(me)}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    payload = {"email": req.email.lower().strip(), "password": req.password}
    try:
        data = await _proxy_json("POST", "/api/auth/login", json_body=payload)
    except HTTPException as e:
        # Map upstream "401" detail to a friendlier message but keep the status
        raise HTTPException(status_code=e.status_code, detail=e.detail if e.detail else "Invalid email or password")
    token = data.get("access_token") or data.get("token")
    if not token:
        raise HTTPException(status_code=500, detail="No token returned from upstream")
    me = await _proxy_json("GET", "/api/auth/me", creds=HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    return {"token": token, "user": mobile_user_to_web(me)}


@api_router.get("/auth/me")
async def me(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    data = await _proxy_json("GET", "/api/auth/me", creds=creds)
    return mobile_user_to_web(data)


@api_router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    # Mobile takes the same shape
    data = await _proxy_json("POST", "/api/auth/forgot-password", json_body={"email": req.email.lower().strip()})
    # If upstream returned a dev URL, rewrite to point at our frontend
    if "dev_reset_url" in data:
        try:
            from urllib.parse import urlparse, parse_qs
            token = parse_qs(urlparse(data["dev_reset_url"]).query).get("token", [""])[0]
            origin = request.headers.get("origin") or request.headers.get("referer") or ""
            if origin and token:
                from urllib.parse import urlparse as up
                u = up(origin)
                data["dev_reset_url"] = f"{u.scheme}://{u.netloc}/reset?token={token}"
        except Exception:
            pass
    return data


@api_router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    return await _proxy_json("POST", "/api/auth/reset-password",
                              json_body={"token": req.token, "new_password": req.new_password})


# ============================================================
# Videos (proxied)
# ============================================================
@api_router.get("/videos")
async def list_videos(limit: int = 50, skip: int = 0,
                       creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    data = await _proxy_json("GET", "/api/videos", creds=creds, params={"limit": limit, "skip": skip})
    return [mobile_video_to_web(v) for v in (data or [])]


@api_router.get("/videos/following")
async def list_following_videos(limit: int = 50,
                                 creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    # Get my id
    me_data = await _proxy_json("GET", "/api/auth/me", creds=creds)
    my_id = me_data.get("id")
    if not my_id:
        return []
    following = await _proxy_json("GET", f"/api/users/{my_id}/following", creds=creds)
    follow_ids = {u.get("id") for u in (following or []) if u.get("id")}
    if not follow_ids:
        return []
    # Fetch all visible videos and filter (mobile API has no native feed endpoint)
    vids = await _proxy_json("GET", "/api/videos", creds=creds, params={"limit": 200})
    out = [mobile_video_to_web(v) for v in (vids or []) if v.get("creator_id") in follow_ids]
    return out[:limit]


@api_router.get("/videos/{video_id}")
async def get_video(video_id: str, creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    # Public metadata
    v = await _proxy_json("GET", f"/api/videos/{video_id}", creds=creds)
    out = mobile_video_to_web(v)
    # Try to fetch a signed playable URL (requires auth + active subscription on upstream)
    if creds:
        try:
            url_data = await _proxy_json("GET", f"/api/videos/{video_id}/stream-url", creds=creds)
            if isinstance(url_data, dict):
                out["url"] = url_data.get("url") or url_data.get("stream_url") or ""
            elif isinstance(url_data, str):
                out["url"] = url_data
        except HTTPException as e:
            # 401 → login required, 402 → premium required: bubble up so frontend paywalls
            raise
    else:
        raise HTTPException(status_code=401, detail="Login required")
    return out


@api_router.delete("/videos/{video_id}")
async def delete_video(video_id: str, creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    await _proxy_json("DELETE", f"/api/videos/{video_id}", creds=creds)
    return {"deleted": True}


@api_router.post("/videos/upload")
async def upload_video(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
):
    """Stream upload to mobile backend's POST /api/videos (multipart form)."""
    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    headers = _auth_header(creds)
    # Read file fully (FastAPI UploadFile is a SpooledTemporaryFile under the hood)
    contents = await file.read()
    files = {"file": (file.filename or "video.mp4", contents, file.content_type or "video/mp4")}
    data = {
        "title": title.strip()[:120],
        "description": (description or "").strip()[:2000],
        "mime_type": file.content_type or "video/mp4",
        "no_ai_confirmed": "true",
    }
    r = await http_client().post("/api/videos", headers=headers, data=data, files=files, timeout=httpx.Timeout(600.0, connect=10.0))
    if r.status_code >= 400:
        try:
            body = r.json()
        except Exception:
            body = {"detail": r.text[:500]}
        raise HTTPException(status_code=r.status_code, detail=body.get("detail", body))
    return mobile_video_to_web(r.json())


# ============================================================
# Users / Follow (proxied with username→id resolution)
# ============================================================
async def _resolve_username(username: str, creds=None) -> Optional[dict]:
    """Map a username to the mobile user record via search."""
    res = await _proxy_json("GET", "/api/users/search", creds=creds, params={"q": username})
    if not res:
        return None
    # exact match first
    for u in res:
        if (u.get("username") or "").lower() == username.lower():
            return u
    return res[0]


@api_router.get("/users/{username}")
async def get_user_profile(username: str, creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    found = await _resolve_username(username, creds=creds)
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    user_id = found["id"]
    # Get full public record + user's videos
    user = await _proxy_json("GET", f"/api/users/{user_id}", creds=creds)
    user_web = mobile_user_to_web(user)
    # videos by user
    vids = await _proxy_json("GET", f"/api/users/{user_id}/videos", creds=creds)
    vids_web = [mobile_video_to_web(v) for v in (vids or [])]
    # is_following
    is_following = False
    if creds:
        try:
            fs = await _proxy_json("GET", f"/api/users/{user_id}/follow-status", creds=creds)
            is_following = bool(fs.get("is_following"))
        except HTTPException:
            pass
    return {"user": user_web, "is_following": is_following, "videos": vids_web}


@api_router.post("/users/{username}/follow")
async def follow_user(username: str, creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    found = await _resolve_username(username, creds=creds)
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    await _proxy_json("POST", f"/api/users/{found['id']}/follow", creds=creds)
    return {"following": True}


@api_router.delete("/users/{username}/follow")
async def unfollow_user(username: str, creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    found = await _resolve_username(username, creds=creds)
    if not found:
        raise HTTPException(status_code=404, detail="User not found")
    await _proxy_json("DELETE", f"/api/users/{found['id']}/follow", creds=creds)
    return {"following": False}


# ============================================================
# Stripe checkout (local), syncs subscription back to mobile on success
# ============================================================
def _get_stripe(host_url: str) -> StripeCheckout:
    webhook_url = f"{host_url}/api/payments/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api_router.post("/payments/checkout")
async def create_checkout(req: CheckoutCreateRequest, request: Request,
                          creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    if not creds:
        raise HTTPException(status_code=401, detail="Login required")
    me = await _proxy_json("GET", "/api/auth/me", creds=creds)
    user_id = me.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="User not found")

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
            "plan": "monthly_membership",
            "user_token": creds.credentials,  # so the webhook/status can sync to upstream
        },
    )
    res = await stripe_client.create_checkout_session(checkout_req)

    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": res.session_id,
        "user_id": user_id,
        "amount": SUBSCRIPTION_AMOUNT,
        "currency": SUBSCRIPTION_CURRENCY,
        "payment_status": "pending",
        "created_at": now_iso(),
        "user_token": creds.credentials,
    })
    return {"url": res.url, "session_id": res.session_id}


async def _activate_on_mobile(token: str) -> None:
    """Mark the user as subscribed on the mobile backend."""
    try:
        r = await http_client().post("/api/subscription/dev-activate",
                                      headers={"Authorization": f"Bearer {token}"})
        if r.status_code >= 400:
            logger.warning("Mobile dev-activate failed %s: %s", r.status_code, r.text[:200])
        else:
            logger.info("Mobile dev-activate ok")
    except Exception as e:
        logger.exception("Mobile dev-activate exception: %s", e)


@api_router.get("/payments/checkout/{session_id}")
async def get_checkout_status(session_id: str, request: Request,
                               creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)):
    host_url = str(request.base_url).rstrip("/")
    stripe_client = _get_stripe(host_url)
    s = await stripe_client.get_checkout_status(session_id)

    txn = await db.payment_transactions.find_one({"session_id": session_id})
    already_processed = txn and txn.get("payment_status") == "paid"

    if s.payment_status == "paid" and not already_processed and txn:
        token = txn.get("user_token") or (creds.credentials if creds else None)
        if token:
            await _activate_on_mobile(token)
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "paid_at": now_iso()}},
        )

    # Fetch fresh user status from mobile
    is_premium = False
    premium_until = None
    if creds:
        try:
            me = await _proxy_json("GET", "/api/auth/me", creds=creds)
            is_premium = bool(me.get("is_subscribed"))
            premium_until = me.get("current_period_end") or me.get("subscription_expires_at")
        except HTTPException:
            pass

    return {
        "status": s.status,
        "payment_status": s.payment_status,
        "amount_total": int(s.amount_total or 0),
        "currency": s.currency or SUBSCRIPTION_CURRENCY,
        "is_premium": is_premium,
        "premium_until": premium_until,
    }


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
            token = txn.get("user_token")
            if token:
                await _activate_on_mobile(token)
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
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_event():
    global _http
    if _http is not None:
        await _http.aclose()
        _http = None
    mongo_client.close()
