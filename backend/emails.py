"""Transactional email helpers for WeClips (SendGrid).

Sync SendGrid SDK wrapped in `asyncio.to_thread` so callers in an async
context (e.g. FastAPI webhooks) don't block the event loop.
"""
import asyncio
import logging
import os
from typing import Optional

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

logger = logging.getLogger(__name__)


def _client() -> Optional[SendGridAPIClient]:
    key = os.environ.get("SENDGRID_API_KEY", "").strip()
    if not key:
        return None
    return SendGridAPIClient(key)


def _from_email() -> Email:
    addr = os.environ.get("SENDER_EMAIL", "welcome@weclips.app")
    name = os.environ.get("SENDER_NAME", "WeClips")
    return Email(addr, name)


def _public_logo_url() -> str:
    return os.environ.get("PUBLIC_LOGO_URL", "https://weclips.app/api/static/weclips-logo.png")


def _public_icon_url() -> str:
    return os.environ.get("PUBLIC_ICON_URL", "https://weclips.app/api/static/weclips-icon.png")


def _welcome_html(first_name: str, trial_end_date: Optional[str]) -> str:
    name = (first_name or "there").strip() or "there"
    trial_line = (
        f"Your first $0.99 charge will be on <b>{trial_end_date}</b>."
        if trial_end_date else
        "Your first $0.99 charge will be after your 7-day free trial."
    )
    logo = _public_logo_url()
    icon = _public_icon_url()
    return f"""\
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#F4FAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4FAFF;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;">
            <tr>
              <td style="padding:32px 36px 20px 36px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td valign="middle" style="padding-right:14px;">
                      <img src="{icon}" alt="" width="56" height="56" style="display:block;border:0;outline:none;text-decoration:none;width:56px;height:56px;border-radius:12px;">
                    </td>
                    <td valign="middle">
                      <img src="{logo}" alt="WeClips" width="140" height="42" style="display:block;border:0;outline:none;text-decoration:none;height:42px;width:140px;">
                      <p style="margin:4px 0 0 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;font-weight:600;">Ad-free · No AI · No chaos</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 0 36px;">
                <h1 style="margin:0;font-size:28px;line-height:1.2;color:#0F172A;letter-spacing:-0.01em;">Welcome, {name} 👋</h1>
                <p style="margin:16px 0 0 0;font-size:16px;line-height:1.55;color:#475569;">
                  Your <b style="color:#0F172A;">7-day free trial</b> is live. You can now watch every clip ad-free, follow creators, and upload your own. {trial_line}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px 4px 36px;">
                <a href="https://weclips.app" style="display:inline-block;background:#89CFF0;color:#0A1929;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;font-size:15px;">Open WeClips →</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0 36px;">
                <h2 style="margin:0;font-size:16px;color:#0F172A;font-weight:700;">A few things to try first</h2>
                <ul style="margin:10px 0 0 0;padding-left:20px;color:#475569;font-size:14px;line-height:1.7;">
                  <li>Tap any clip on the Discover page — they all stream ad-free now.</li>
                  <li>Hit the <b>Upload</b> tab and share your first clip (up to 25 GB).</li>
                  <li>Use the search bar at the top of Discover to find creators by handle.</li>
                </ul>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 36px;border-top:1px solid #F1F5F9;margin-top:24px;">
                <p style="margin:24px 0 0 0;font-size:13px;color:#64748B;line-height:1.6;">
                  Need a hand? Just reply to this email or write to
                  <a href="mailto:support@weclips.app" style="color:#2B8FCA;">support@weclips.app</a>.
                  You can cancel anytime from <b>Settings → Membership → Manage subscription</b> — no charge if you cancel before day 7.
                </p>
                <p style="margin:18px 0 0 0;font-size:12px;color:#94A3B8;">
                  WeClips · Ad-free · No AI · No chaos.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
"""


def _welcome_text(first_name: str, trial_end_date: Optional[str]) -> str:
    name = (first_name or "there").strip() or "there"
    trial_line = (
        f"Your first $0.99 charge will be on {trial_end_date}."
        if trial_end_date else
        "Your first $0.99 charge will be after your 7-day free trial."
    )
    return (
        f"Welcome, {name}!\n\n"
        f"Your 7-day free trial of WeClips is live. {trial_line}\n\n"
        "A few things to try:\n"
        "- Watch any clip on the Discover page (ad-free now)\n"
        "- Share your first clip in the Upload tab (up to 25 GB)\n"
        "- Search creators from the top of Discover\n\n"
        "Open WeClips: https://weclips.app\n\n"
        "Cancel anytime from Settings → Membership → Manage subscription — no charge if you cancel before day 7.\n"
        "Questions? support@weclips.app\n\n"
        "— WeClips · Ad-free · No AI · No chaos.\n"
    )


async def send_welcome_trial_email(
    to_email: str,
    first_name: str = "",
    trial_end_date: Optional[str] = None,
) -> bool:
    """Fire off the 'trial started' email. Returns True on 2xx from SendGrid.

    Failures are logged, not raised — we never want a flaky email to
    fail a Stripe webhook (Stripe would retry and we'd double-charge).
    """
    sg = _client()
    if not sg or not to_email:
        logger.warning("SendGrid not configured or missing recipient — skipping welcome email")
        return False

    mail = Mail(
        from_email=_from_email(),
        to_emails=To(to_email),
        subject="Welcome to WeClips — your 7-day free trial is live",
    )
    mail.add_content(Content("text/plain", _welcome_text(first_name, trial_end_date)))
    mail.add_content(Content("text/html", _welcome_html(first_name, trial_end_date)))

    def _send():
        return sg.send(mail)

    try:
        resp = await asyncio.to_thread(_send)
        ok = 200 <= resp.status_code < 300
        if ok:
            logger.info("Welcome email sent to %s (status %s)", to_email, resp.status_code)
        else:
            logger.warning("SendGrid returned %s for %s: %s", resp.status_code, to_email, getattr(resp, "body", ""))
        return ok
    except Exception:
        logger.exception("Welcome email send failed for %s", to_email)
        return False
