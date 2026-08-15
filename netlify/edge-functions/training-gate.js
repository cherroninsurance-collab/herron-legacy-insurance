/* Producer OS — access gate for /training/*
 *
 * Proprietary & Confidential
 * Copyright © 2026 Connor Herron. All Rights Reserved.
 * Unauthorized distribution or public hosting prohibited.
 *
 * Runs at the edge, BEFORE any static file is served, so nothing under
 * /training/ reaches an unauthenticated visitor — not the HTML, not the JS,
 * and not data.js, which is where all the training copy actually lives.
 *
 * SETUP: Netlify → Site configuration → Environment variables →
 *   TRAINING_PASSCODE        (required) the passcode Connor types on the phone
 *   TRAINING_COOKIE_SECRET   (optional) HMAC key for the session cookie.
 *                            Defaults to TRAINING_PASSCODE, which means
 *                            changing the passcode signs everyone out.
 *
 * If TRAINING_PASSCODE is unset the gate FAILS CLOSED — /training/ returns 503
 * rather than silently serving the app to the world.
 */

const COOKIE = "pos_session";
const SESSION_DAYS = 30;

/* ---------- signing ---------- */

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(sig);
}

// length-independent compare — never short-circuit on the first wrong byte
function safeEqual(a, b) {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

async function issue(secret) {
  const expires = Date.now() + SESSION_DAYS * 86400000;
  const payload = String(expires);
  return `${payload}.${await sign(payload, secret)}`;
}

async function valid(token, secret) {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const expected = await sign(payload, secret);
  if (!safeEqual(token.slice(dot + 1), expected)) return false;
  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

/* ---------- unlock page ---------- */

function unlockPage(error) {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Producer OS</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; padding:24px;
         background:#0F172A; color:#E2E8F0;
         font-family:system-ui,-apple-system,'Segoe UI',sans-serif; }
  .card { width:100%; max-width:380px; background:#131D36;
          border:1px solid rgba(148,163,184,.12); border-radius:16px; padding:26px 22px;
          display:flex; flex-direction:column; gap:16px; }
  .mark { width:42px; height:42px; border-radius:11px;
          background:linear-gradient(135deg,#0EA5E9,#10B981); display:grid; place-items:center;
          font-weight:700; font-size:19px; color:#06121F; }
  h1 { margin:0; font-size:20px; font-weight:700; color:#F8FAFC; letter-spacing:-.01em; }
  p { margin:0; font-size:13.5px; line-height:1.55; color:#94A3B8; }
  input { width:100%; padding:14px; font-size:16px; border-radius:11px; color:#E2E8F0;
          background:#0B1222; border:1px solid rgba(148,163,184,.16); outline:none; }
  input:focus { border-color:rgba(14,165,233,.5); }
  button { width:100%; min-height:48px; border:0; border-radius:11px; cursor:pointer;
           background:linear-gradient(135deg,#0EA5E9,#10B981); color:#06121F;
           font-size:15px; font-weight:700; }
  .err { font-size:13px; color:#F87171; background:rgba(239,68,68,.08);
         border:1px solid rgba(239,68,68,.34); border-radius:10px; padding:11px 13px; }
  .notice { font-family:ui-monospace,Menlo,monospace; font-size:10px; line-height:1.7;
            letter-spacing:.04em; color:#7C8BA5; border-top:1px solid rgba(148,163,184,.1);
            padding-top:14px; }
</style>
</head><body>
  <form class="card" method="POST" action="">
    <div class="mark">P</div>
    <h1>Producer OS</h1>
    <p>Internal training. Enter the passcode to continue.</p>
    ${error ? `<div class="err">${error}</div>` : ""}
    <input type="password" name="passcode" placeholder="Passcode" autocomplete="current-password"
           autofocus required aria-label="Passcode">
    <button type="submit">Unlock</button>
    <div class="notice">
      Proprietary &amp; Confidential<br>
      Copyright &copy; 2026 Connor Herron. All Rights Reserved.<br>
      Unauthorized distribution or public hosting prohibited.
    </div>
  </form>
</body></html>`;
}

const HTML = { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" };

/* ---------- gate ---------- */

export default async function gate(request, context) {
  const passcode = Netlify.env.get("TRAINING_PASSCODE");
  const secret = Netlify.env.get("TRAINING_COOKIE_SECRET") || passcode;

  // Fail closed. A missing passcode must never mean "let everyone in".
  if (!passcode) {
    return new Response(
      "Producer OS is not configured — set TRAINING_PASSCODE in the Netlify environment.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // Already signed in → hand off to the static files.
  if (await valid(readCookie(request, COOKIE), secret)) return context.next();

  if (request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const attempt = form ? String(form.get("passcode") || "") : "";

    if (safeEqual(attempt, passcode)) {
      const url = new URL(request.url);
      return new Response(null, {
        status: 303,
        headers: {
          Location: url.pathname + url.search,
          "Set-Cookie": `${COOKIE}=${await issue(secret)}; Path=/; Max-Age=${SESSION_DAYS * 86400}` +
            `; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      });
    }

    // Slow down guessing. Edge instances aren't shared, so this is a speed
    // bump rather than a real rate limiter — keep the passcode long.
    await new Promise((r) => setTimeout(r, 1200));
    return new Response(unlockPage("That passcode didn't match."), { status: 401, headers: HTML });
  }

  // Only navigations get the unlock page. Asset requests get a bare 401 so the
  // service worker sees a failed response and never caches the gate as the app.
  const wantsHtml = (request.headers.get("accept") || "").includes("text/html");
  return wantsHtml
    ? new Response(unlockPage(null), { status: 401, headers: HTML })
    : new Response("Locked", { status: 401, headers: { "Cache-Control": "no-store" } });
}

export const config = { path: ["/training", "/training/*"] };
