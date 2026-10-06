const OPEN_DAYS = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);
const OPEN_START = 8 * 60 + 30;
const OPEN_END = 12 * 60 + 30;

export function santoCallsOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Rome",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value ?? "";
  if (!OPEN_DAYS.has(value("weekday"))) return false;
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  return minutes >= OPEN_START && minutes < OPEN_END;
}
