function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function isActiveEventDate(eventDate: string, now = new Date()) {
  return eventDate >= getLocalDateKey(now);
}

export function isPastEventDateKey(eventDate: string, now = new Date()) {
  return eventDate < getLocalDateKey(now);
}
