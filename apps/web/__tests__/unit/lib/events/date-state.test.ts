import { getLocalDateKey, isActiveEventDate, isPastEventDateKey } from "@/lib/events/date-state";

describe("event date state helpers", () => {
  const noon = new Date(2026, 1, 20, 12, 0, 0);

  it("formats a local date key without timezone rollover", () => {
    expect(getLocalDateKey(noon)).toBe("2026-02-20");
  });

  it("treats events on the current day as active", () => {
    expect(isActiveEventDate("2026-02-20", noon)).toBeTruthy();
    expect(isPastEventDateKey("2026-02-20", noon)).toBeFalsy();
  });

  it("treats events before the current day as past", () => {
    expect(isActiveEventDate("2026-02-19", noon)).toBeFalsy();
    expect(isPastEventDateKey("2026-02-19", noon)).toBeTruthy();
  });
});
