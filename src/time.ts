// Small shared time helpers for scheduled sessions (#93/#94). Times are the local
// machine clock (the scheduling engine fires on the local clock).

/** Format a Date as a local `<input type="datetime-local">` value (no timezone
 * suffix — datetime-local is local-clock). */
export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Compact local fire time for a schedule (e.g. "Jun 21, 3:45 PM"). */
export function formatFireTime(fireAt: number): string {
  return new Date(fireAt * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
