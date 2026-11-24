const display = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

/** Format a YYYY-MM-DD (or ISO) date without shifting the calendar day. */
export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const day = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) {
    return value;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  return display.format(new Date(Date.UTC(year, month - 1, date)));
}
