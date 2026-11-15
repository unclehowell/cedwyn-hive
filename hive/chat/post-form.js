const ALLOWED_ORIGINS = new Set([
  'https://bucklerfamily.estate',
  'https://cedwyn.bucklerfamily.estate',
]);

export const POST_FORM_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderPostForm({ ref = '', message = '' } = {}) {
  const safeRef = /^[a-f0-9]{32}$/i.test(ref) ? ref.toLowerCase() : '';
  const notice = message ? `<p class="notice" role="status">${escapeHtml(message)}</p>` : '';
  const dedupe = safeRef ? `<input type="hidden" name="ref" value="${safeRef}">` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>Post to Hive</title>
<style>
:root{color-scheme:light dark;font-family:system-ui,sans-serif}
body{margin:0;padding:24px;background:Canvas;color:CanvasText}
main{max-width:620px;margin:0 auto}
h1{font-size:1.5rem;margin:0 0 8px}
p{line-height:1.5}
form{display:grid;gap:14px;margin:24px 0}
label{display:grid;gap:6px;font-weight:600}
input,textarea,button{font:inherit;padding:11px;border:1px solid #888;border-radius:7px;background:Canvas;color:CanvasText}
textarea{min-height:150px;resize:vertical}
button{cursor:pointer;font-weight:700}
.notice{padding:10px;border-left:3px solid #b7791f}
.muted{opacity:.75;font-size:.92rem}
a{color:inherit}
</style>
</head>
<body>
<main>
<h1>Post to Hive</h1>
<p>Use only your own seat number and your own seat key or unused one-time claim code. The credential is submitted in the HTTPS POST body; it is not placed in the URL, saved by this page, or included in the result.</p>
${notice}
<form method="post" action="/hive/api/chat/form-post" autocomplete="off">
<label>My seat number
<input name="seat" inputmode="numeric" pattern="[0-9]{1,3}" maxlength="3" required>
</label>
<label>My seat key or unused one-time claim code
<input name="code" type="password" maxlength="256" autocomplete="off" autocapitalize="off" spellcheck="false" required>
</label>
<label>Message (plain English, up to 1,500 characters)
<textarea name="text" maxlength="1500" required></textarea>
</label>
${dedupe}
<button type="submit">Post message</button>
</form>
<p class="muted">The existing Hive filter, privacy rules, rate limits and duplicate protection still apply. This form cannot post as the dealer or as another seat.</p>
<p><a href="/hive/chat/">Return to Hive chat</a></p>
</main>
</body>
</html>`;
}

export async function readPostForm(request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin') || '';
  if (!ALLOWED_ORIGINS.has(requestUrl.origin) || origin !== requestUrl.origin) {
    return { ok: false, status: 403, reason: 'Submit this form from the official Hive chat page.' };
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin') {
    return { ok: false, status: 403, reason: 'Cross-site form submissions are not accepted.' };
  }
  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/x-www-form-urlencoded(?:;|$)/i.test(contentType)) {
    return { ok: false, status: 415, reason: 'Use the Hive browser form to submit the message.' };
  }
  let fields;
  try {
    fields = await request.formData();
  } catch {
    return { ok: false, status: 400, reason: 'The form submission could not be read. Please try again.' };
  }
  const seat = String(fields.get('seat') || '').trim();
  const code = String(fields.get('code') || '').trim();
  const text = String(fields.get('text') || '').trim();
  const ref = String(fields.get('ref') || '').trim().toLowerCase();
  if (!/^\d{1,3}$/.test(seat) || seat === '1') {
    return { ok: false, status: 400, reason: 'Enter your own non-dealer seat number.' };
  }
  if (!code || code.length > 256) {
    return { ok: false, status: 400, reason: 'Enter your own seat key or unused one-time claim code.' };
  }
  if (!text || text.length > 1500) {
    return { ok: false, status: 400, reason: 'Write a message of 1 to 1,500 characters.' };
  }
  if (ref && !/^[a-f0-9]{32}$/.test(ref)) {
    return { ok: false, status: 400, reason: 'The optional duplicate reference is invalid.' };
  }
  return { ok: true, seat, code, text, ref };
}
