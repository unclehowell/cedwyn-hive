#!/usr/bin/env python3
"""Hive chat <-> Telegram bridge (owner's ask, WhatsApp 18:08 GMT 11 Nov 2026). Box-side, polls; no webhook, no bot token on the box.
OUT: every new visible hive chat message (chat.json since_id) goes to the owner's DM with the bot as "[seat N Agent] text".
     The owner's own seat-6 posts are not echoed back. state/tg.json "last_fwd_id" moves after each accepted send (no repeats).
IN:  TELEGRAM_GET_UPDATES (offset in state). Text from chat id OWNER_CHAT only (private chat, sender id equal) is posted to the hive
     chat as seat 6 "Owner (via Telegram)" through the Worker's dealer-only bridge_post (via "telegram": same filter and seat rate
     limits, each Telegram update posted once). Every other sender is ignored and never answered. The owner gets a one-line reply
     (posted / why not). A 429 keeps the message pending for the next run.
Telegram calls go through the box's connected Telegram app (@Cedwynbot), one call per ~3.5 s. Needs TAB_TASK_ID of a live turn.
Usage: TAB_TASK_ID=<turn> timeout -k 5 150 python3 /home/user/tab/work/hive-chat/tg_bridge.py [--dry-run] [--simulate "text" [--from <chat id>]]
       [--init "intro text"]  (one-time: send the intro, forward the latest message, start the marker there)
First line printed: TG OK in=<n> out=<n> ... / TG HELD ... / TG ERROR ...   Log: tg-log.md.  — Sion's Tab agent"""
import json, os, sys, time, subprocess, tempfile, hashlib, fcntl, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(HERE, 'state', 'tg.json'); LOG = os.path.join(HERE, 'tg-log.md')
BASE = 'https://cedwyn.bucklerfamily.estate'; RESOLVE = ['--resolve', 'cedwyn.bucklerfamily.estate:443:104.21.35.81']
OWNER_CHAT = int(json.load(open(os.path.join(HERE, 'private', 'telegram.json')))['owner_chat_id']); OWNER_SEAT = '6'; OWNER_AGENT = 'Owner (via Telegram)'
MAX_SINGLE = 6; TG_GAP = 3.5; TG_MAX = 3800
DRY = '--dry-run' in sys.argv
TID = os.environ.get('TAB_TASK_ID')
if not TID: sys.exit('TG ERROR TAB_TASK_ID not set')
def arg(name):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else None
def now(): return dt.datetime.now(dt.timezone.utc)
def iso(t=None): return (t or now()).strftime('%Y-%m-%dT%H:%M:%SZ')
def log(line):
    with open(LOG, 'a') as f: f.write(f"- {iso()} {'DRY ' if DRY else ''}{line}\n")
def load():
    try: return json.load(open(SP))
    except Exception: return {}
def save(st):
    if DRY: return
    os.makedirs(os.path.dirname(SP), exist_ok=True); tmp = SP + '.tmp'; json.dump(st, open(tmp, 'w'), indent=1); os.replace(tmp, SP)
def curl(args, t=40):
    r = subprocess.run(['timeout', '-k', '5', str(t), 'curl', '-s', '-m', str(t - 5), *RESOLVE, '-w', '\n%{http_code}', *args], capture_output=True, text=True)
    body, _, code = r.stdout.rpartition('\n')
    try: return int(code or 0), json.loads(body)
    except Exception: return int(code or 0), {'raw': body[:300]}
def key(): return open(os.path.join(HERE, 'private', 'seat1.key')).read().strip()
def admin(body):
    return curl(['-X', 'POST', BASE + '/hive/api/chat/admin', '-H', 'Authorization: Bearer ' + key(), '-H', 'content-type: application/json', '-d', json.dumps(body)])

_last = [0.0]
def tg(slug, args):
    gap = TG_GAP - (time.time() - _last[0])
    if gap > 0: time.sleep(gap)
    d = f'/home/user/tab/tasks/{TID}/tgbridge'; os.makedirs(d, exist_ok=True)
    f = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, dir=d); json.dump({'toolkit': 'telegram', 'tool_slug': slug, 'arguments': args}, f); f.close()
    try: p = subprocess.run(['timeout', '-k', '5', '60', 'node', '/home/user/tab/connected-apps-cli.mjs', 'connected_apps.execute', f.name], capture_output=True, text=True)
    finally:
        _last[0] = time.time()
        try: os.unlink(f.name)
        except OSError: pass
    try:
        r = json.loads(p.stdout); res = (r.get('result') or {})
        rp = res.get('result_path')   # a big answer is delivered as a file
        out = res.get('result')
        if out is None and rp and os.path.exists(rp): out = json.load(open(rp))
        if rp and os.path.exists(rp):
            try: os.remove(rp)
            except OSError: pass
        return out if isinstance(out, dict) else {'ok': False, 'raw': str(r)[:300]}
    except Exception: return {'ok': False, 'raw': (p.stdout or p.stderr)[-300:]}
def send_owner(text):
    if DRY: print('DRY would send to owner:', text[:300]); return {'ok': True, 'result': {'message_id': None}}
    return tg('TELEGRAM_SEND_MESSAGE', {'chat_id': OWNER_CHAT, 'text': text[:4000], 'disable_web_page_preview': True})
def fmt(m): return f"[seat {m['seat']} {m['agent']}] {m['text']}"

# ---------- IN: owner's Telegram messages -> hive chat seat 6
def handle_update(u, st, results):
    """returns True when the update is finished (offset may pass it), False to keep it pending."""
    m = u.get('message') or {}
    chat = (m.get('chat') or {}); frm = (m.get('from') or {})
    if chat.get('id') != OWNER_CHAT or frm.get('id') != OWNER_CHAT or chat.get('type') != 'private':
        results['ignored'] += 1; log(f"ignored update {u.get('update_id')} (not the owner's private chat)"); return True
    text = (m.get('text') or '').strip()
    if not text:
        if m: send_owner('Only text messages go to the hive chat. Send it as text and I will post it.')
        results['ignored'] += 1; return True
    if text.startswith('/'):
        if text.split()[0].lower() in ('/start', '/help'):
            send_owner('Messages you send to this bot appear in the hive chat as Owner (via Telegram). Plain English, under 1500 characters; never your name, emails, phone numbers or addresses. New hive messages arrive here.')
        return True
    ref = str(u.get('update_id'))
    if DRY:
        c, b = admin({'action': 'check', 'text': text})
        print(f"DRY inbound from owner chat would post as seat {OWNER_SEAT} ({OWNER_AGENT}): {text[:200]} -> filter {'ok' if b.get('ok') else 'REFUSED: ' + str(b.get('why'))}")
        results['in'] += 1; return False
    c, b = admin({'action': 'bridge_post', 'seat': OWNER_SEAT, 'text': text, 'ref': ref, 'via': 'telegram'})
    if c in (200, 201):
        mid = (b.get('message') or {}).get('id') or b.get('message_id')
        results['in'] += 1; results['posted'].append(mid); log(f"in: owner message posted as seat 6 id={mid}{' (already posted)' if b.get('duplicate') else ''}")
        if not b.get('duplicate'): send_owner(f'Posted to the hive chat (message {mid}).')
        return True
    if c == 422:
        results['refused'] += 1; log(f"in: filter refused owner message: {str(b.get('why'))[:120]}")
        send_owner(f"Not posted to the hive chat: {b.get('why') or b.get('error')} Edit it and send again.")
        return True
    log(f'in: held status={c} {str(b)[:120]}; stays pending'); results['held'] = c; return False

def inbound(st, results):
    sim = arg('--simulate')
    if sim is not None:   # dry-run only test path; never posts
        frm = int(arg('--from') or OWNER_CHAT)
        u = {'update_id': -1, 'message': {'chat': {'id': frm, 'type': 'private'}, 'from': {'id': frm}, 'text': sim}}
        global DRY; DRY = True
        done = handle_update(u, st, results); print('DRY simulate from', frm, '-> ignored' if results['ignored'] else '-> handled'); return
    off = st.get('tg_offset')
    args = {'timeout': 0, 'limit': 50, 'allowed_updates': ['message']}
    if off: args['offset'] = off
    r = tg('TELEGRAM_GET_UPDATES', args)
    if not r.get('ok'):
        results['tg_error'] = str(r.get('description') or r.get('raw') or r)[:160]; log(f"getUpdates failed: {results['tg_error']}"); return
    ups = sorted(r.get('result') or [], key=lambda x: x.get('update_id', 0))
    for u in ups:
        if not handle_update(u, st, results):
            break   # keep this one (and later ones) pending; offset stays below it
        st['tg_offset'] = u['update_id'] + 1; save(st)
        if results['in'] + results['refused'] >= 5: break   # seat 6 rate limits: at most 5 a run

# ---------- OUT: new hive chat messages -> owner's DM
def outbound(st, results):
    last = int(st.get('last_fwd_id') or 0)
    c, b = curl([BASE + f'/hive/chat.json?limit=50&since_id={last}&cb={int(time.time()*1000)}'])
    if c != 200: results['chat_error'] = c; log(f'chat.json status={c}'); return
    msgs = sorted([m for m in (b.get('messages') or []) if int(m['id']) > last], key=lambda m: int(m['id']))
    todo = [m for m in msgs if str(m.get('seat')) != OWNER_SEAT]
    if not todo:
        if msgs: st['last_fwd_id'] = int(msgs[-1]['id']); save(st)
        return
    singles, rest = (todo, []) if len(todo) <= MAX_SINGLE else ([], todo)
    for m in singles:
        r = send_owner(fmt(m))
        if not r.get('ok'): results['tg_error'] = str(r.get('description') or r.get('raw'))[:160]; log(f"send failed at id={m['id']}: {results['tg_error']}"); return
        st['last_fwd_id'] = int(m['id']); save(st); results['out'] += 1; results['tg_ids'].append((r.get('result') or {}).get('message_id'))
    chunk = []
    def flush():
        if not chunk: return True
        r = send_owner('\n\n'.join(fmt(m) for m in chunk))
        if not r.get('ok'): results['tg_error'] = str(r.get('description') or r.get('raw'))[:160]; log(f"send failed at id={chunk[0]['id']}: {results['tg_error']}"); return False
        st['last_fwd_id'] = int(chunk[-1]['id']); save(st); results['out'] += len(chunk); results['tg_ids'].append((r.get('result') or {}).get('message_id')); chunk.clear(); return True
    for m in rest:
        if sum(len(fmt(x)) + 2 for x in chunk) + len(fmt(m)) > TG_MAX and not flush(): return
        chunk.append(m)
    flush()
    if msgs and not results.get('tg_error') and int(msgs[-1]['id']) > int(st.get('last_fwd_id') or 0):
        st['last_fwd_id'] = int(msgs[-1]['id']); save(st)   # trailing seat-6 messages

def init(st, intro):
    c, b = curl([BASE + f'/hive/chat.json?limit=1&cb={int(time.time()*1000)}'])
    latest = (b.get('messages') or [None])[-1] if c == 200 else None
    if not latest: print('TG ERROR no latest message'); return
    r1 = send_owner(intro); print('intro', json.dumps(r1)[:300])
    r2 = send_owner(fmt(latest)); print('latest', json.dumps(r2)[:300])
    if r1.get('ok') and r2.get('ok'):
        st['last_fwd_id'] = int(latest['id']); st['started_at'] = iso(); save(st)
        log(f"init: intro tg={(r1.get('result') or {}).get('message_id')} latest id={latest['id']} tg={(r2.get('result') or {}).get('message_id')}")

def main():
    os.makedirs(os.path.join(HERE, 'state'), exist_ok=True)
    lk = open(os.path.join(HERE, 'state', 'tg.lock'), 'w')
    try: fcntl.flock(lk, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError: print('TG HELD another run holds the lock'); return
    st = load()
    if '--init' in sys.argv: init(st, arg('--init')); return
    if 'last_fwd_id' not in st and not DRY: print('TG ERROR not initialised (run --init first)'); return
    res = {'in': 0, 'refused': 0, 'ignored': 0, 'out': 0, 'posted': [], 'tg_ids': []}
    inbound(st, res)
    if arg('--simulate') is None: outbound(st, res)
    st['last_run'] = iso(); save(st)
    head = 'TG HELD' if res.get('held') or res.get('tg_error') or res.get('chat_error') else 'TG OK'
    line = f"{head} in={res['in']} refused={res['refused']} ignored={res['ignored']} out={res['out']} last_fwd_id={st.get('last_fwd_id')}" + \
           (f" posted={res['posted']}" if res['posted'] else '') + (f" tg_error={res['tg_error']}" if res.get('tg_error') else '') + (f" chat_error={res['chat_error']}" if res.get('chat_error') else '')
    print(line)
    if res['in'] or res['out'] or res['refused'] or head != 'TG OK': log(line)
if __name__ == '__main__': main()
