export function issuePage(items, requestedLimit = 50, requestedOffset = 0) {
  const rows = Array.isArray(items) ? items : [];
  const limit = Math.max(1, Math.min(100, Number(requestedLimit) || 50));
  const offset = Math.max(0, Math.min(3000, Number(requestedOffset) || 0));
  const jobs = rows.slice(offset, offset + limit);
  const nextOffset = offset + jobs.length < rows.length ? offset + jobs.length : null;
  return {
    offset,
    limit,
    total: rows.length,
    returned: jobs.length,
    has_more: nextOffset !== null,
    next_offset: nextOffset,
    jobs
  };
}
