# WeClips Web — PRD

## Original Problem Statement
Web app companion for the user's existing `weclips` mobile app (no mobile app rebuild). Requirements:
- Simple email/password auth
- Light minimal theme, Comic Sans font, baby blue (#89CFF0) branding
- Users can follow each other
- $0.99/month Stripe paywall to watch/upload native videos
- Must mirror the data and feel of the existing mobile app

## Architecture (IMPORTANT)
- **Backend = PROXY**: FastAPI (`/app/backend/server.py`) forwards all `/api/*` traffic via httpx to the production mobile API `https://ad-free-video-12.emergent.host`. NO direct MongoDB for app data (local Mongo only stores Stripe payment_transactions).
- Stripe checkout is local; on payment success the web backend calls upstream `/api/subscription/dev-activate` to grant subscription in the shared DB.
- Frontend: React + Tailwind + shadcn, Comic Sans, light theme.
- Production deployment: https://weclips.app (user redeploys to push fixes).

## What's Been Implemented
### Earlier sessions
- Full React frontend: Discover, Following, Upload, Watch (with 402 paywall), Profile, Auth, Billing, Forgot/Reset password
- Proxy backend pivot (replaced direct MongoDB); display_name/username UI parity with mobile

### 2026-06-11 — Full mobile-feature parity (tested 17/17 backend, 100% frontend)
- **User search**: `/search` page + sidebar/mobile nav; backend `GET /api/users/search`
- **Followers/Following lists**: clickable counts on profile open dialogs; `GET /api/users/by-id/{id}/followers|following`
- **Profile settings** (`/settings`): edit display name, username, bio; avatar upload (canvas-resized base64) / remove; email + password change; followers-hidden toggle
- **Likes & comments**: like button on Watch; comments list/add/delete/like (members only, mirrors upstream 402)
- **Safety**: report video, report user, block/unblock users (blocked list in Settings)
- **Notifications**: `/notifications` page, unread badge in sidebar + mobile header, mark-read
- **Share clip (2026-06-11)**: Share button on Watch page — native share sheet on mobile, copy-link on desktop; share link `/api/share/{video_id}` serves Open Graph/Twitter preview tags (title, creator, thumbnail) for rich previews in iMessage/WhatsApp/FB, then redirects humans to `/watch/{id}`; share counter stored in local Mongo (`share_counts`), shown on Watch meta row and included in `GET /api/videos/{id}` as `shares`
- **Legal & disclaimers**: Terms of Service + Privacy Policy proxied via `GET /api/legal/{terms|privacy}`; links in sidebar footer + Settings; support email (support@weclips.app) from `/api/config`
- **Danger zone**: log out, delete account (upstream deletion_pending)

## Key Endpoints (local proxy)
- Auth: POST signup/login, GET/PATCH/DELETE /auth/me, PUT/DELETE /auth/me/avatar, forgot/reset password
- Videos: GET /videos, /videos/following, GET/DELETE /videos/{id}, POST /videos/upload, POST /videos/{id}/like, GET/POST/DELETE comments + comment like, POST /videos/{id}/report
- Users: GET /users/search, GET /users/{username} (profile+videos), POST/DELETE follow, GET /users/by-id/{id}/followers|following, POST/DELETE /users/by-id/{id}/block, POST /users/by-id/{id}/report, GET /users/me/blocks
- Notifications: GET /notifications, POST mark-read, GET unread-count
- Misc: GET /config, GET /legal/{page}
- Payments: POST /payments/checkout, GET /payments/checkout/{session_id}, POST /payments/webhook/stripe

### 2026-06-11 — Bug fix: own Profile tab "User not found"
- Root cause: upstream `/api/users/search` excludes the requesting user, so username→id resolution failed for one's own profile. Fixed `_resolve_username` to check `/api/auth/me` first (same as mobile app's Profile tab); also removed unsafe fuzzy fallback (now exact username match only). Frontend Profile redirects to /auth on 401.

### 2026-06-11 — Bug fix: follow button state + following count
- Upstream `follow-status` returns `following` (not `is_following`) → button never showed "Following". Upstream public user record has NO `following` field → following count was always 0. Fixed: read `following` from follow-status, override followers/following counts from follow-status live values, merge `following` from /auth/me for own profile. Verified full toggle cycle in UI.

### 2026-06-11 — UI tweaks
- Removed duplicate "Become a Member" hero button on guest Discover screen (sidebar button remains).
- Upload limits raised on web: 25GB / 180 min (UI validation + proxy timeout 2h). ⚠️ Upstream mobile API still enforces max_video_size_bytes=5GB (config) — files >5GB will be rejected upstream until the mobile backend's limit is raised.

### 2026-06-11 — Proxy hardening
- `_proxy_json` now retries GETs once on transient upstream/Cloudflare errors (5xx/52x + transport failures) and returns a friendly "WeClips is having a moment…" message instead of leaking raw Cloudflare/HTML error pages to users. JSON error details (e.g., "Not authenticated") still pass through unchanged.

### 2026-06-11 — No-thumbnail placeholder
- VideoCard: removed the generic Unsplash placeholder image; videos without a thumbnail (or with broken thumbnail URLs) now show a grey box with an ImageOff icon + "No thumbnail" label (testid `no-thumbnail-{id}`).

### 2026-06-12 — Founder badge + founder moderation
- Mapped upstream `is_founder` through user serializers. Profile shows gold "👑 FOUNDER" badge (testid `founder-badge`) — Nixon/@kissingerez has it.
- Watch page delete button now shows for video owner OR founder account (`canDelete = isOwner || user.is_founder`); deletion authorization enforced by upstream mobile API (same as mobile app).
- Bonus fix: `followers_hidden` was missing from the user mapping (Settings toggle always initialized to false) — now mapped.

### 2026-06-12 — Founder moderation panel (/admin)
- New "Moderation" sidebar item (founder only) → /admin page with Reports + Banned accounts tabs.
- Reports: shows target (video/user/comment), reason, reporter, target user's warning/ban status; actions: Dismiss, Warn (reason), Suspend (1–365 days + reason), Ban (reason), Delete content. All proxied to upstream /api/admin/* (founder-only, upstream returns 403 otherwise — verified).
- Banned accounts tab with Unban.
- A TEST report was filed on "Me and Armin" (reason marked TEST) so the founder can try the panel — dismiss it.
- NOTE: founder-view rendering not yet verified live (no founder credentials in dev); user to verify as @kissingerez.

### 2026-06-12 — Clickable usernames
- Video cards: creator name/@handle and avatar now link to the creator's profile (thumbnail/title still link to the watch page). Fixed JSX nesting during restructure.
- Comment authors link to profiles via new id-based route `/p/:userId` (backend `GET /api/users/by-id/{id}/profile`, since comments only carry user_id). Refactored profile logic into shared `_profile_payload()`.

### 2026-06-13 — Fix: 413 on large video uploads (e.g. 636 MB clip)
- Root cause: web ingress in front of weclips.app rejected bodies above its limit before they reached our FastAPI proxy.
- Fix: web Upload page now POSTs the multipart file **directly** to the canonical mobile backend `/api/videos` (CORS confirmed open for preview + production origins, echoes Origin with credentials). New endpoint `GET /api/config/upload-target` returns the URL so we don't hardcode the host on the client.
- The legacy proxy route `POST /api/videos/upload` is left in place untouched as a fallback / for non-browser clients.
- Mobile backend contract is unchanged (same form fields: title, description, mime_type, no_ai_confirmed, file). The native iOS app is unaffected.
- Verified end-to-end: tiny test clip uploaded, returned `id`, then deleted via DELETE /api/videos/{id}; preflight + auth + Authorization-bearer all succeed.

### 2026-06-19 — Stripe LIVE subscriptions + 7-day free trial
- Switched from one-time $0.99 charges to true recurring monthly subscriptions via official `stripe` Python SDK (`stripe==14.4.1`), replacing the `emergentintegrations` wrapper (which doesn't support subscription mode or trials).
- `.env` swapped from `sk_test_emergent` to live `sk_live_…` key. Added `STRIPE_PRICE_ID` (pinned the canonical $0.99/mo recurring Price ID so startup never needs Stripe API) and `STRIPE_WEBHOOK_SECRET` placeholder (user to fill from Stripe Dashboard).
- New: `_ensure_stripe_price()` bootstraps a Product + monthly Price on first run (idempotent lookup by `weclips_plan` metadata), result cached in process.
- `POST /api/payments/checkout` creates a `mode='subscription'` Checkout Session with `subscription_data.trial_period_days=7`, `customer_email`, and `client_reference_id` = weclips_user_id. `allow_promotion_codes` enabled.
- `POST /api/payments/portal` returns a Stripe Customer Billing Portal URL so members can self-cancel / update card.
- `GET /api/payments/me` exposes status/trial_end/current_period_end/cancel_at_period_end for the Settings page.
- Webhook (`POST /api/payments/webhook/stripe`) verifies signature with `STRIPE_WEBHOOK_SECRET` and handles: `checkout.session.completed`, `invoice.paid` (extends upstream premium each month), `invoice.payment_failed` (marks `past_due`), `customer.subscription.updated/deleted`. New Mongo collection `subscriptions` stores stripe_customer_id/subscription_id ↔ user_token mapping so monthly renewals can re-activate upstream premium without the user being online.
- Frontend: Billing page rebranded to "Start 7-day free trial / $0.99/mo after trial"; Settings → Membership shows trial end date or renewal date and a "Manage subscription" button that opens the Stripe billing portal; sidebar CTA "Try free for 7 days".
- Verified on preview: live checkout session `cs_live_…` created end-to-end with mode=subscription, $0.99 USD, monthly recurring. Trial behavior tested via `subscription_data.trial_period_days=7` passed correctly to Stripe.

## Backlog / Next Tasks
- **P1: E2E test of Stripe → mobile subscription sync** (webhook → dev-activate grants premium) — still pending user verification with a real test payment
- P2: Refactor server.py (~750 lines) into routers (auth/videos/social/payments)
- P2: Upload page — verify large-file upload limits against proxy (upstream max 5GB / 3h)
- P3: Comment avatars (upstream CommentPublic has no avatar/username fields)

## Test Data
- Test user: webtester01@example.com / Test1234! (subscription dev-activated until 2026-07-11). See /app/memory/test_credentials.md.
- Real user "Nixon" (@kissingerez) — do not modify.
- Tests: /app/backend/tests/backend_test.py (17 passing)
