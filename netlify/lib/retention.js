export const RETENTION_MONTHS = 24;

export function retentionCutoff(now = new Date(), months = RETENTION_MONTHS) {
  const cutoff = new Date(now.getTime());
  cutoff.setMonth(cutoff.getMonth() - months);
  return cutoff;
}

export function isPastRetention(createdAt, now = new Date(), months = RETENTION_MONTHS) {
  const time = Date.parse(createdAt || "");
  if (!Number.isFinite(time)) return false;
  return time <= retentionCutoff(now, months).getTime();
}

export function nextPage(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    if (!/rel="next"/.test(part)) continue;
    const match = part.match(/<([^>]+)>/);
    if (match) return match[1];
  }
  return null;
}

export function idsToDelete(submissions, now = new Date(), months = RETENTION_MONTHS) {
  if (!Array.isArray(submissions)) return [];
  return submissions
    .filter((item) => item && item.id && isPastRetention(item.created_at, now, months))
    .map((item) => item.id);
}
