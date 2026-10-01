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