// Small shared time helpers for scheduled sessions (#93/#94). Times are the local
// machine clock (the scheduling engine fires on the local clock).

/** Format a Date as a local `<input type="datetime-local">` value (no timezone
 * suffix — datetime-local is local-clock). */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Compact local fire time for a schedule. When the fire time is on the **same local
 * calendar day** as `now`, show only the time (e.g. "3:45 PM") to keep the UI cleaner
 * (#232); any other day keeps the date + time (e.g. "Jun 21, 3:45 PM"). `now` is
 * injectable so the "today" check is unit-testable with a fixed clock. */
export function formatFireTime(fireAt: number, now: Date = new Date()): string {
  const at = new Date(fireAt * 1000);
  const isToday =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();
  return at.toLocaleString(
    [],
    isToday
      ? { hour: "numeric", minute: "2-digit" }
      : { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" },
  );
}

/** Convert a raw `resets_at` from the usage endpoint (#154) — an ISO-8601 string,
 * or a unix timestamp in seconds or milliseconds as a numeric string — to epoch ms.
 * `Date.parse` natively handles the endpoint's timezone-aware ISO form. Returns
 * `null` when absent or unparseable. */
export function parseResetsAt(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    // >= 1e12 → already milliseconds; otherwise seconds.
    return n >= 1e12 ? n : n * 1000;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

/** Compact reset countdown for the usage bar (#154): "2h 14m" / "14m" / "<1m". */
export function formatResetCountdown(
  resetsAtMs: number,
  nowMs: number,
): string {
  const minutes = Math.floor((resetsAtMs - nowMs) / 60_000);
  if (minutes <= 0) return "<1m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
