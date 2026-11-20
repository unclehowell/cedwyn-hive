#!/usr/bin/env python3
"""Deploy work/hive-chat/worker/ as the Cloudflare Worker cedwyn-hive-chat (Durable Object HiveChat, SQLite) on routes
cedwyn.bucklerfamily.estate/hive/chat* and /hive/api/chat* through the connected Cloudflare account. Undo rows go to
work/cf-rebalance/changes.json. Usage: timeout -k 5 900 python3 deploy.py "<message>"   — Sion's Tab agent"""
import json, os, sys, base64, datetime as dt
sys.path.insert(0, '/home/user/tab/work/agent-ready')
import deploy as AR
HERE = os.path.dirname(os.path.abspath(__file__)); W = HERE
ACCT, ZONE, CF = AR.ACCT, AR.ZONE, AR.CF
NAME = 'cedwyn-hive-chat'; ROUTES = ['cedwyn.bucklerfamily.estate/hive/chat*', 'cedwyn.bucklerfamily.estate/hive/api/chat*']
SP = os.path.join(HERE, 'state.json'); ST = json.load(open(SP)) if os.path.exists(SP) else {}
def save(): json.dump(ST, open(SP, 'w'), indent=1)
def call(method, path, body=None):
    req = {"toolkit": "cloudflare", "method": method, "url": CF + path}
    if body is not None: req["body"] = body
    r = AR.ca(req); res = r.get('result') or {}; b = res.get('body')
    if b is None and res.get('body_head'):
        try: b = json.loads(res['body_head'])
        except Exception: b = {'raw': res['body_head'][:800]}
    if isinstance(b, str):
        try: b = json.loads(b)
        except Exception: b = {'raw': b[:800]}
    return int(res.get('status') or 0), (b or {'raw': json.dumps(r)[:800]})
def log(what, rollback):
    P = '/home/user/tab/work/cf-rebalance/changes.json'; ch = json.load(open(P))
    ch.append({"at_utc": dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'), "by": "cedwyn-hive-chat (work/hive-chat/deploy.py)", "what": what, "rollback": rollback})
    json.dump(ch, open(P, 'w'), ensure_ascii=False, indent=1)
def setup():
    if not ST.get('d1_id'):
        s, b = call('POST', f'/accounts/{ACCT}/d1/database', {"name": NAME})
        print('d1', s, json.dumps(b)[:300])
        ST['d1_id'] = b['result']['uuid']; save(); log(f"D1 {NAME} created ({ST['d1_id']})", f"DELETE /accounts/{ACCT}/d1/database/{ST['d1_id']}")
    if not ST.get('worker_id'):
        s, b = call('POST', f'/accounts/{ACCT}/workers/workers', {"name": NAME, "subdomain": {"enabled": False}, "observability": {"enabled": True}})
        print('worker', s, json.dumps(b)[:300]); ST['worker_id'] = b['result']['id']; save()
        log(f"Worker {NAME} created ({ST['worker_id']})", f"DELETE /accounts/{ACCT}/workers/scripts/{NAME}")
def deploy(msg):
    modules = [
        {"name": "index.js", "content_type": "application/javascript+module", "content_base64": base64.b64encode(open(os.path.join(W, 'worker.js'), 'rb').read()).decode()},
        {"name": "post-form.js", "content_type": "application/javascript+module", "content_base64": base64.b64encode(open(os.path.join(W, 'post-form.js'), 'rb').read()).decode()},
    ]
    binds = [{"type": "durable_object_namespace", "name": "CHAT", "class_name": "HiveChat"}] if ST.get('do_migrated') else []
    for v in ('AUTH0_DOMAIN', 'AUTH0_AUDIENCE'):
        if v in ST.get('plain_vars', {}): binds.append({"type": "plain_text", "name": v, "text": ST['plain_vars'][v]})
    b = {"compatibility_date": "2025-01-01", "main_module": "index.js", "modules": modules, "bindings": binds, **({"migrations": {"new_tag": "v1", "new_sqlite_classes": ["HiveChat"]}} if not ST.get('do_migrated') else {}), "annotations": {"workers/message": msg[:80]}}
    s, up = call('POST', f"/accounts/{ACCT}/workers/workers/{ST['worker_id']}/versions", b)
    if s not in (200, 201): print('version failed', s, json.dumps(up)[:1500]); sys.exit(1)
    vid = up['result']['id']
    s, dep = call('POST', f"/accounts/{ACCT}/workers/scripts/{NAME}/deployments", {"strategy": "percentage", "versions": [{"version_id": vid, "percentage": 100}], "annotations": {"workers/message": msg[:80]}})
    if s not in (200, 201): print('deploy failed', s, json.dumps(dep)[:1500]); sys.exit(1)
    prev = ST.get('version'); ST['previous'] = prev; ST['version'] = vid; ST['do_migrated'] = 'v1'; save()
    log(f"{NAME}: version {vid} deployed 100%: {msg}", f"POST /accounts/{ACCT}/workers/scripts/{NAME}/deployments with version {prev}" if prev else f"DELETE /accounts/{ACCT}/workers/scripts/{NAME}")
    print(json.dumps({"version": vid, "previous": prev}))
def routes():
    ST.setdefault('routes', {})
    for pat in ROUTES:
        if pat in ST['routes']: continue
        s, b = call('POST', f'/zones/{ZONE}/workers/routes', {"pattern": pat, "script": NAME})
        print('route', pat, s, json.dumps(b)[:300])
        if s in (200, 201): ST['routes'][pat] = b['result']['id']; save(); log(f"route {pat} -> {NAME}", f"DELETE /zones/{ZONE}/workers/routes/{b['result']['id']}")
if __name__ == '__main__':
    if '--setup' in sys.argv: setup()
    deploy(sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'cedwyn-hive-chat update')
    if '--setup' in sys.argv or '--routes' in sys.argv: routes()
