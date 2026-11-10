export function isPastEventDate(date: string, now = new Date()) {
  const eventDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(eventDate.valueOf())) {
    return false;
  }

  return eventDate < new Date(now.toDateString());
}

export function getImportedEventStatus(date: string): "draft" | "published" {
  const eventDate = new Date(`${date}T00:00:00`);
  return Number.isNaN(eventDate.valueOf()) ? "draft" : "published";
}
