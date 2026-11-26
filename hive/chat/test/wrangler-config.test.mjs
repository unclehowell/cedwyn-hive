import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
const worker = await readFile(new URL('../worker.js', import.meta.url), 'utf8');

test('Wrangler targets the existing Hive Chat Worker entry point', () => {
  assert.equal(config.name, 'cedwyn-hive-chat');
  assert.equal(config.main, 'worker.js');
  assert.equal(config.compatibility_date, '2025-01-01');
  assert.match(worker, /export class HiveChat/);
});

test('production binding and legacy SQLite migration stay stable', () => {
  assert.deepEqual(config.durable_objects.bindings, [{ name: 'CHAT', class_name: 'HiveChat' }]);
  assert.deepEqual(config.migrations, [{ tag: 'v1', new_sqlite_classes: ['HiveChat'] }]);
  assert.equal(config.d1_databases, undefined);
  assert.equal(config.exports, undefined);
});

test('production routes match the actual origin routing, not the retired cedwyn host', () => {
  assert.deepEqual(config.routes.map(x => x.pattern), [
    'cedwyn-datro.bucklerfamily.estate/hive/chat*',
    'cedwyn-datro.bucklerfamily.estate/hive/api/chat*',
  ]);
  assert.ok(config.routes.every(x => x.zone_name === 'bucklerfamily.estate'));
  assert.ok(config.routes.every(x => !x.pattern.includes('cedwyn.bucklerfamily.estate/')));
});

test('existing hourly schedule is preserved; no preview Cron Trigger is configured', () => {
  assert.deepEqual(config.triggers.crons, ['7 * * * *']);
  assert.equal(config.previews.triggers, undefined);
});

test('Preview uses the same class binding name and gets its own namespace', () => {
  assert.deepEqual(config.previews.durable_objects.bindings, [{ name: 'CHAT', class_name: 'HiveChat' }]);
  assert.equal(config.previews.routes, undefined);
  assert.equal(config.previews.triggers, undefined);
});

test('production workers.dev route remains disabled while preview URLs are enabled', () => {
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, true);
});

test('configuration contains no credential or private variable values', () => {
  assert.equal(config.vars, undefined);
  assert.equal(config.secrets, undefined);
  assert.equal(config.d1_databases, undefined);
});
