/** Formats an ISO date string as dd-mm-yyyy (UTC, so the picked day never shifts). */
export function formatDate(value: string) {
  return new Date(value)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\//g, "-");
}

/** Formats a timestamp as dd-mm-yyyy, hh:mm am/pm in the viewer's local time zone. */
export function formatDateTime(value: string) {
  return new Date(value)
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\//g, "-");
}