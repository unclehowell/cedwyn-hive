import test from "node:test";
import assert from "node:assert/strict";
import { issuePage } from "../src/issue-page.js";

const rows = Array.from({ length: 235 }, (_, i) => ({ number: i + 1 }));

test("returns the first bounded page and a next offset", () => {
  const page = issuePage(rows, 100, 0);
  assert.equal(page.offset, 0);
  assert.equal(page.limit, 100);
  assert.equal(page.total, 235);
  assert.equal(page.returned, 100);
  assert.equal(page.has_more, true);
  assert.equal(page.next_offset, 100);
  assert.equal(page.jobs[0].number, 1);
  assert.equal(page.jobs[99].number, 100);
});

test("returns a middle page without overlap", () => {
  const page = issuePage(rows, 100, 100);
  assert.equal(page.jobs[0].number, 101);
  assert.equal(page.jobs.at(-1).number, 200);
  assert.equal(page.next_offset, 200);
});

test("returns a terminal partial page and no next offset", () => {
  const page = issuePage(rows, 100, 200);
  assert.equal(page.returned, 35);
  assert.equal(page.jobs[0].number, 201);
  assert.equal(page.jobs.at(-1).number, 235);
  assert.equal(page.has_more, false);
  assert.equal(page.next_offset, null);
});

test("clamps invalid limit and offset", () => {
  const page = issuePage(rows, 1000, -12);
  assert.equal(page.limit, 100);
  assert.equal(page.offset, 0);
});
