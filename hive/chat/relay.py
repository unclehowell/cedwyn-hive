#!/usr/bin/env python3
"""Hive chat relay (seat 1, Tab). Each run posts AT MOST ONE plain-English message to the hive chat summarising real hive
activity since the last post, or nothing when nothing changed.
Sources: (1) HubSpot hive task subjects ([TURN: <seat> vX.Y.Z], [OTHER AGENT'S TURN ...], READY / GMAIL DRAFT statuses):
version bumps, turn hand-offs, drafts that reached READY; (2) GitHub (user:unclehowell): new issues and comments by accounts
other than the owner's own account (other seats' connectors, e.g. chatgpt-codex-connector), bots excluded.
State: state/relay.json (since-marker + last seen subject per task). Rate/filters: the chat Worker enforces 1/20 s, 30/h,
200/day and the house filter; on 422 the relay retries once with a counts-only text; on 429/5xx it posts nothing and keeps
the marker. Needs TAB_TASK_ID of a live turn (connected apps). Usage:
  TAB_TASK_ID=<turn> timeout -k 5 170 python3 /home/user/tab/work/hive-chat/relay.py [--dry-run] [--since=<ISO>] [--bridge-only]
First it runs the HubSpot bridge (seats 2-5: new 'CHAT: <message>' lines in their claim tasks -> chat as that seat, once each).
Built 11 Nov 2026 for the owner's "nothing in hive chat for days" (task f2b4fdf5). — Sion's Tab agent"""
import json, os, re, sys, time, subprocess, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__))
SP = os.path.join(HERE, 'state', 'relay.json'); LOG = os.path.join(HERE, 'relay-log.md')
BASE = 'https://cedwyn.bucklerfamily.estate'; RESOLVE = ['--resolve', 'cedwyn.bucklerfamily.estate:443:104.21.35.81']
DRY = '--dry-run' in sys.argv
PROTECTED = {"533955669218", "534356372727", "535186012348", "535717193945", "536500730053", "529380023505", "536905368813", "532517620954"}
SEATS = ['Tab', 'ChatGPT', 'Grok', 'Claude', 'Instinct']
BOTS = re.compile(r'\[bot\]$|^github-actions|^dependabot|^cloudflare|^vercel|^netlify', re.I)
OWNER_LOGIN = 'unclehowell'
sys.path.insert(0, '/home/user/tab/work/site-flywheels/tools'); sys.path.insert(0, '/home/user/tab/work/hive-check')
TID = os.environ.get('TAB_TASK_ID')
if not TID: sys.exit('relay: TAB_TASK_ID not set')
def now(): return dt.datetime.now(dt.timezone.utc)
def iso(t): return t.strftime('%Y-%m-%dT%H:%M:%SZ')
def log(line):
    with open(LOG, 'a') as f: f.write(f"- {iso(now())} {line}\n")
def curl(args, t=40):
    r = subprocess.run(['timeout', '-k', '5', str(t), 'curl', '-s', '-m', str(t - 5), *RESOLVE, '-w', '\n%{http_code}', *args], capture_output=True, text=True)
    body, _, code = r.stdout.rpartition('\n'); return int(code or 0), body
def key(): return open(os.path.join(HERE, 'private', 'seat1.key')).read().strip()
def load():
    try: return json.load(open(SP))
    except Exception: return {}
def save(st):
    os.makedirs(os.path.dirname(SP), exist_ok=True); tmp = SP + '.tmp'; json.dump(st, open(tmp, 'w'), indent=1); os.replace(tmp, SP)

BR = re.compile(r"^\[([^\]]*)\]\s*(.*)$")
def parse(subj):
    m = BR.match(subj or '')
    if not m: return None
    tag, rest = m.group(1), m.group(2)
    tm = re.match(r"TURN:\s*([A-Za-z]+)", tag); vm = re.search(r"v(\d+\.\d+\.\d+)", tag)
    org = re.split(r"\s+[-\u2013\u2014]\s+|:", rest, 1)[0].strip()
    if len(org) > 40: org = org[:40].rsplit(' ', 1)[0]
    seat = tm.group(1) if tm else ('open' if "OTHER AGENT'S TURN" in tag else '')
    st = re.sub(r"\s*v\d+\.\d+\.\d+.*$", "", tag).strip()
    return {'seat': seat, 'ver': vm.group(1) if vm else '', 'org': org, 'ready': bool(re.search(r'READY|GMAIL DRAFT', tag)), 'status': st}

def hubspot_changes(since_ms):
    import check as CK
    hs = CK._hs_caller(); props = ['hs_task_subject', 'hs_lastmodifieddate', 'hs_task_status']
    def grp(tok): return {'filters': [{'propertyName': 'hs_task_subject', 'operator': 'CONTAINS_TOKEN', 'value': tok},
                                      {'propertyName': 'hs_lastmodifieddate', 'operator': 'GTE', 'value': str(since_ms)}]}
    out = {}; after = 0
    for _ in range(25):
        s = hs('POST', '/crm/v3/objects/tasks/search', {'filterGroups': [grp('TURN'), grp('READY'), grp('DRAFT')], 'properties': props,
               'limit': 10, 'after': str(after), 'sorts': [{'propertyName': 'hs_lastmodifieddate', 'direction': 'ASCENDING'}]})
        got = [r for r in (s.get('results') or []) if isinstance(r, dict) and r.get('id')]
        for r in got: out[r['id']] = r.get('properties') or {}
        after += len(got)
        if not got or (not s.get('_cut') and (len(got) < 10 or after >= (s.get('total') or 0))): break
        time.sleep(3)
    return {k: v for k, v in out.items() if k not in PROTECTED}

GQL = """query($q:String!,$c:String){search(query:$q,type:ISSUE,first:10,after:$c){pageInfo{hasNextPage endCursor} nodes{
 ... on Issue{number createdAt author{login} repository{name} comments(last:10){nodes{author{login} createdAt}}}
 ... on PullRequest{number createdAt author{login} repository{name} comments(last:10){nodes{author{login} createdAt}}}}}}"""
def github_changes(since):
    import gh as G
    issues, comments = [], []; cur = None
    for _ in range(4):
        st, b = G.gh('POST', 'https://api.github.com/graphql', {'query': GQL, 'variables': {'q': f'user:{OWNER_LOGIN} updated:>={since} sort:updated-desc', 'c': cur}})
        if st != 200 or not isinstance(b, dict): break
        srch = ((b.get('data') or {}).get('search') or {})
        for n in srch.get('nodes') or []:
            if not isinstance(n, dict) or not n.get('repository'): continue
            a = ((n.get('author') or {}).get('login') or '')
            if a and a != OWNER_LOGIN and not BOTS.search(a) and (n.get('createdAt') or '') >= since: issues.append((a, n['repository']['name'], n.get('number')))
            for c in ((n.get('comments') or {}).get('nodes') or []):
                ca = ((c.get('author') or {}).get('login') or '')
                if ca and ca != OWNER_LOGIN and not BOTS.search(ca) and (c.get('createdAt') or '') >= since: comments.append((ca, n['repository']['name'], n.get('number')))
        pi = srch.get('pageInfo') or {}
        if b.get('_truncated') or not pi.get('hasNextPage'): break
        cur = pi.get('endCursor'); time.sleep(3)
    return issues, comments

def who(login):
    l = login.lower()
    for s in SEATS:
        if s.lower() in l: return s
    return 'another agent'

def compose(changes, prev, gh_issues, gh_comments, since_label, first):
    handoffs, bumps, ready, newtasks, holders, moved = [], 0, [], 0, {}, 0
    for tid, p in changes.items():
        cur = parse(p.get('hs_task_subject')); old = parse(prev.get(tid, '')) if prev.get(tid) else None
        if not cur: continue
        holders[cur['seat'] or cur['status'] or '?'] = holders.get(cur['seat'] or cur['status'] or '?', 0) + 1
        if old is None:
            if not first and cur['ver'] in ('0.1.0', '0.0.1'): newtasks += 1
            else: moved += 1
        else:
            if old['ver'] != cur['ver']: bumps += 1
            if old['seat'] and cur['seat'] and old['seat'] != cur['seat']: handoffs.append((old['seat'], cur['seat'], cur['org']))
        if cur['ready'] and not (old and old['ready']): ready.append(cur['org'])
    parts = []
    if moved: parts.append(f"{moved} hive draft task{'s' if moved != 1 else ''} moved since {since_label}.")
    if True:
        if bumps: parts.append(f"{bumps} hive draft{'s' if bumps != 1 else ''} got a new version since {since_label}.")
        if handoffs:
            pairs = {}
            for a, b_, _ in handoffs: pairs[(a, b_)] = pairs.get((a, b_), 0) + 1
            parts.append('Turns passed: ' + '; '.join(f"{a} to {b_} ({n})" for (a, b_), n in sorted(pairs.items(), key=lambda x: -x[1])[:6]) + '.')
        if newtasks: parts.append(f"{newtasks} new draft task{'s' if newtasks != 1 else ''} joined the queue.")
    if ready: parts.append('Reached READY or a mailbox draft: ' + ', '.join(sorted(set(ready))[:6]) + '.')
    if changes:
        top = sorted(((k, v) for k, v in holders.items() if k in SEATS), key=lambda x: -x[1])[:5]
        if top: parts.append('Of those, the turn now sits with: ' + ', '.join(f"{k} {v}" for k, v in top) + '.')
    if gh_issues or gh_comments:
        by = {}
        for a, r, n in gh_issues: by.setdefault(who(a), [0, 0])[0] += 1
        for a, r, n in gh_comments: by.setdefault(who(a), [0, 0])[1] += 1
        def gp(k, v):
            bits = ([f"opened {v[0]} issue{'s' if v[0] != 1 else ''}"] if v[0] else []) + ([f"left {v[1]} comment{'s' if v[1] != 1 else ''}"] if v[1] else [])
            return k + ' ' + ' and '.join(bits)
        parts.append('On GitHub: ' + '; '.join(gp(k, v) for k, v in by.items()) + '.')
    if not parts: return None, None
    head = 'Tab (seat 1) hive update. '
    tail = ' Seats with a pending turn: pick it up from your HubSpot task and say here what you are taking.'
    text = head + ' '.join(parts) + tail
    if len(text) > 1450: text = text[:1440].rsplit(' ', 1)[0] + '...'
    counts = head + f"{len(changes)} hive tasks changed and {len(gh_issues) + len(gh_comments)} GitHub items by other seats since {since_label}." + tail
    return text, counts

def post(text):
    if DRY: print('DRY RUN would post:', text); return 0, {}
    c, b = curl(['-X', 'POST', BASE + '/hive/api/chat', '-H', 'Authorization: Bearer ' + key(), '-H', 'content-type: application/json',
                 '-d', json.dumps({'agent': 'Tab', 'seat': '1', 'text': text})])
    try: b = json.loads(b)
    except Exception: b = {'raw': b[:200]}
    return c, b


# ---------- HubSpot comment bridge (11 Nov 2026): seats that cannot send HTTP write "CHAT: <message>" lines in their own
# claim task; each new line is posted once as that seat through the Worker's dealer-only bridge_post (same filter and seat rate
# limits, marked "(via HubSpot bridge)"). Seen state: state/relay.json "bridge_seen" (+ the Worker's own text-hash table). — Sion's Tab agent
BRIDGE_SEATS = {'2': ('ChatGPT', '535912760519'), '3': ('Grok', '535491617993'), '4': ('Claude', '535504130249'), '5': ('Instinct', '542864837836')}  # seat 5 added 11 Nov 2026 (owner m:b61db9c2)
CHAT_LINE = re.compile(r'^\s*(?:[-*\u2022]\s*)?CHAT:\s*(.+?)\s*$', re.I)
def body_lines(html_body):
    import html as H
    t = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</li>|<p[^>]*>|<div[^>]*>|<li[^>]*>', '\n', html_body or '')
    t = H.unescape(re.sub(r'<[^>]+>', '', t)).replace('\xa0', ' ')
    return [l for l in t.split('\n') if l.strip()]
def bridge_candidates(body):
    out = []
    for l in body_lines(body):
        m = CHAT_LINE.match(l)
        if not m: continue
        msg = m.group(1).strip()
        if not msg or "Sion's Tab agent" in msg or msg.startswith('<'): continue   # our own lines / the instruction's placeholder
        out.append(msg)
    return out
def admin(body):
    c, b = curl(['-X', 'POST', BASE + '/hive/api/chat/admin', '-H', 'Authorization: Bearer ' + key(), '-H', 'content-type: application/json', '-d', json.dumps(body)])
    try: b = json.loads(b)
    except Exception: b = {'raw': b[:200]}
    return c, b
def bridge(st, budget_s=95, per_seat=2):
    import hashlib, task_body as TB
    t0 = time.time(); seen = st.setdefault('bridge_seen', {}); pending = {}; notes = {}; done = []
    for seat, (agent, tid) in BRIDGE_SEATS.items():
        if time.time() - t0 > budget_s: break
        try: bd, p = TB.read(tid)
        except Exception as e: log(f'bridge read {tid} failed: {str(e)[:100]}'); continue
        if not bd: log(f"bridge read {tid}: no body {str(p.get('_err', ''))[:80]}"); continue
        for msg in bridge_candidates(bd):
            ref = hashlib.sha256(f'{tid}|{msg}'.encode()).hexdigest()[:32]
            if ref not in seen: pending.setdefault(seat, []).append((ref, msg))
    last = {}
    for rnd in range(per_seat):
        for seat, items in pending.items():
            if rnd >= len(items) or time.time() - t0 > budget_s: continue
            ref, msg = items[rnd]; agent, tid = BRIDGE_SEATS[seat]
            if DRY: print(f'DRY RUN bridge would post as seat {seat} ({agent}): {msg[:300]} (via HubSpot bridge)'); continue
            gap = 21 - (time.time() - last.get(seat, 0))
            if gap > 0: time.sleep(gap)
            c, b = admin({'action': 'bridge_post', 'seat': seat, 'text': msg, 'ref': ref}); last[seat] = time.time()
            if c in (200, 201):
                mid = (b.get('message') or {}).get('id') or b.get('message_id')
                seen[ref] = {'seat': seat, 'id': mid, 'at': iso(now()), 'dup': bool(b.get('duplicate'))}; done.append((seat, mid))
                log(f'bridge seat {seat} ({agent}) posted id={mid}{" (already posted)" if b.get("duplicate") else ""}: {msg[:120]}')
            elif c == 422:
                seen[ref] = {'seat': seat, 'refused': b.get('why', '')[:160], 'at': iso(now())}
                notes.setdefault(seat, []).append((msg, b.get('why', '') or b.get('error', '')))
                log(f"bridge seat {seat} refused by the filter: {b.get('why', '')[:120]}")
            else:
                log(f'bridge seat {seat} held status={c}; line stays pending'); items[rnd + 1:] = []
    if not DRY:
        save(st)
        for seat, lst in notes.items():   # tell the seat in its own task, append only, never starting with CHAT:
            agent, tid = BRIDGE_SEATS[seat]
            why = '; '.join(f'"{m[:50]}" ({w[:90]})' for m, w in lst[:3])
            line = f"<p>{now().strftime('%Y-%m-%d %H:%MZ')} · BRIDGE (Tab, seat 1): not posted to the hive chat because the chat filter refused it: {H_esc(why)}. Write it again as a new line. — Sion's Tab agent</p>"
            try: r = TB.append(tid, line, min_age=0); log(f'bridge refusal note to {tid}: {str(r)[:120]}')
            except Exception as e: log(f'bridge refusal note to {tid} failed: {str(e)[:100]}')
    return done, sum(len(v) for v in pending.values())
def H_esc(s):
    import html as H
    return H.escape(s, quote=False)

def main():
    st = load(); first = 'subjects' not in st
    try:
        bdone, bpend = bridge(st)
        print(f'BRIDGE posted={len(bdone)} pending_seen={bpend}' + (' ids=' + ','.join(str(m) for _, m in bdone) if bdone else ''))
    except Exception as e:
        print(f'BRIDGE ERROR {str(e)[:160]}'); log(f'bridge error: {str(e)[:160]}')
    if '--bridge-only' in sys.argv: return
    st = load(); first = 'subjects' not in st
    arg = [a for a in sys.argv if a.startswith('--since=')]
    if arg:
        since_t = dt.datetime.fromisoformat(arg[0].split('=', 1)[1].replace('Z', '+00:00'))
    elif first:
        c, b = curl([BASE + f'/hive/chat/seats.json?cb={int(time.time()*1000)}'])
        last = ([s.get('last_message_at') for s in json.loads(b).get('seats', []) if s.get('seat') == '1'] or [None])[0] if c == 200 else None
        since_t = max(dt.datetime.fromisoformat((last or iso(now() - dt.timedelta(days=1))).replace('Z', '+00:00')), now() - dt.timedelta(days=7))
    else:
        since_t = dt.datetime.fromisoformat(st['since'].replace('Z', '+00:00'))
    run_t = now(); since = iso(since_t); since_label = since_t.strftime('%d %b %H:%M UTC').lstrip('0')
    changes = hubspot_changes(int(since_t.timestamp() * 1000))
    prev = st.get('subjects', {})
    # a subject identical to the stored one is not a change (a body-only edit)
    changes = {k: v for k, v in changes.items() if prev.get(k) != v.get('hs_task_subject')}
    time.sleep(3)
    try: gi, gc = github_changes(since)
    except Exception as e: gi, gc = [], []; log(f'github read failed: {str(e)[:120]}')
    text, counts = compose(changes, prev, gi, gc, since_label, first)
    newsubj = dict(prev); newsubj.update({k: v.get('hs_task_subject') or '' for k, v in changes.items()})
    if not text:
        if not DRY: st.update({'since': iso(run_t), 'subjects': newsubj, 'last_run': iso(run_t)}); save(st)
        print('RELAY NOTHING changes=0'); log('nothing changed, no post'); return
    c, b = post(text)
    if c == 422 and not DRY:
        log(f"filter refused the summary ({b.get('why', '')[:120]}); retrying counts only"); time.sleep(21); c, b = post(counts); text = counts
    if DRY: print('RELAY DRY'); return
    if c in (200, 201):
        mid = (b.get('message') or {}).get('id') or b.get('id')
        st.update({'since': iso(run_t), 'subjects': newsubj, 'last_run': iso(run_t), 'last_post_id': mid, 'last_post_at': iso(run_t)}); save(st)
        print(f'RELAY POSTED id={mid} hubspot={len(changes)} github={len(gi) + len(gc)}'); log(f'posted id={mid}: {text[:200]}')
    elif c == 422:
        st.update({'since': iso(run_t), 'subjects': newsubj, 'last_run': iso(run_t)}); save(st)
        print(f"RELAY REFUSED 422 {b.get('why', '')[:160]}"); log(f"refused twice by the filter, marker moved: {b.get('why', '')[:160]}")
    else:
        print(f'RELAY HELD status={c} {str(b)[:160]}'); log(f'held status={c}; marker kept for the next run')
if __name__ == '__main__': main()
