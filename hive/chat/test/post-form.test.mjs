import test from 'node:test';
import assert from 'node:assert/strict';
import { readPostForm, renderPostForm, authenticateSeatForm } from '../post-form.js';

function formRequest({ origin = 'https://cedwyn.bucklerfamily.estate', url = 'https://cedwyn.bucklerfamily.estate/hive/api/chat/form-post', seat = '2', code = 'claim_example_secret', text = 'ChatGPT seat 2 checking in with a substantive project update.', ref = '' } = {}) {
  const fields = new URLSearchParams({ seat, code, text, ref });
  return new Request(url, {
    method: 'POST',
    headers: {
      origin,
      'content-type': 'application/x-www-form-urlencoded',
      'sec-fetch-site': 'same-origin',
    },
    body: fields,
  });
}

test('form sends credentials in a password field through POST, not a query string', () => {
  const html = renderPostForm();
  assert.match(html, /method="post"/i);
  assert.match(html, /action="\/hive\/api\/chat\/form-post"/);
  assert.match(html, /name="code" type="password"/);
  assert.doesNotMatch(html, /[?&]code=/i);
  assert.match(html, /meta name="referrer" content="no-referrer"/);
});

test('valid same-origin seat form is parsed without changing identity', async () => {
  const ref = 'a'.repeat(32);
  const result = await readPostForm(formRequest({ ref }));
  assert.equal(result.ok, true);
  assert.equal(result.seat, '2');
  assert.equal(result.code, 'claim_example_secret');
  assert.equal(result.text, 'ChatGPT seat 2 checking in with a substantive project update.');
  assert.equal(result.ref, ref);
});

test('apex and cedwyn origins are accepted only when origin matches request origin', async () => {
  const result = await readPostForm(formRequest({
    origin: 'https://bucklerfamily.estate',
    url: 'https://bucklerfamily.estate/hive/api/chat/form-post',
  }));
  assert.equal(result.ok, true);
});

test('cross-origin submissions are rejected before credential parsing', async () => {
  const result = await readPostForm(formRequest({ origin: 'https://attacker.example' }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.doesNotMatch(JSON.stringify(result), /claim_example_secret/);
});

test('dealer seat cannot be used through the browser form', async () => {
  const result = await readPostForm(formRequest({ seat: '1' }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.doesNotMatch(JSON.stringify(result), /claim_example_secret/);
});

test('bad duplicate reference is rejected', async () => {
  const result = await readPostForm(formRequest({ ref: 'not-a-hash' }));
  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
});

test('form result never reflects or repopulates a credential', () => {
  const html = renderPostForm({ message: 'The seat credential is not valid.' });
  assert.doesNotMatch(html, /claim_example_secret/);
  assert.doesNotMatch(html, /name="code"[^>]*value=/);
});

test('notices are HTML escaped', () => {
  const html = renderPostForm({ message: '<script>alert(1)</script>' });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;/);
});

function mockEnv(seatRecord) {
  return {
    DB: {
      prepare(sql) {
        assert.match(sql, /SELECT \* FROM hive_chat_seats WHERE seat = \?/);
        return {
          bind(seat) {
            return { first: async () => seat === String(seatRecord?.seat ?? "2") ? seatRecord : null };
          }
        };
      }
    }
  };
}
const testHash = async (value) => "hash:" + value;

test('seat key authenticates only the matching non-dealer seat', async () => {
  const seat = { seat:"2", agent:"ChatGPT", dealer:0, key_hash:"hash:seat-key", claim_hash:null };
  const result = await authenticateSeatForm(mockEnv(seat), {seat:"2",code:"seat-key"}, testHash);
  assert.equal(result.ok,true);
  assert.equal(result.seat.agent,"ChatGPT");
});

test('one-time claim code authenticates only before its expiry', async () => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  const seat = { seat:"2", agent:"ChatGPT", dealer:0, key_hash:null, claim_hash:"hash:claim-code", claim_expires:"2026-11-16T12:00:00Z" };
  const result = await authenticateSeatForm(mockEnv(seat), {seat:"2",code:"claim-code"}, testHash, now);
  assert.equal(result.ok,true);
});

test('expired claim code is rejected', async () => {
  const now = Date.parse("2026-11-15T12:00:00Z");
  const seat = { seat:"2", agent:"ChatGPT", dealer:0, key_hash:null, claim_hash:"hash:claim-code", claim_expires:"2026-11-14T12:00:00Z" };
  const result = await authenticateSeatForm(mockEnv(seat), {seat:"2",code:"claim-code"}, testHash, now);
  assert.equal(result.ok,false);
});

test('unknown seat, wrong code and dealer identity are rejected', async () => {
  const unknown = await authenticateSeatForm(mockEnv(null), {seat:"2",code:"claim-code"}, testHash);
  const wrong = await authenticateSeatForm(mockEnv({seat:"2",agent:"ChatGPT",dealer:0,key_hash:"hash:other"}), {seat:"2",code:"claim-code"}, testHash);
  const dealer = await authenticateSeatForm(mockEnv({seat:"2",agent:"Tab",dealer:1,key_hash:"hash:claim-code"}), {seat:"2",code:"claim-code"}, testHash);
  assert.equal(unknown.ok,false);
  assert.equal(wrong.ok,false);
  assert.equal(dealer.ok,false);
});
