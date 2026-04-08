export type CalendarCell = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
};

const WEEK_START_MONDAY_INDEX = 1;

export function atMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function compareIso(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function normalizeRange(start: string, end: string): [string, string] {
  return compareIso(start, end) <= 0 ? [start, end] : [end, start];
}

export function isIsoInRange(iso: string, start: string, end: string): boolean {
  const [from, to] = normalizeRange(start, end);
  return compareIso(iso, from) >= 0 && compareIso(iso, to) <= 0;
}

export function buildMonthGrid(monthDate: Date): CalendarCell[] {
  const firstDay = atMonthStart(monthDate);
  const jsDay = firstDay.getDay();
  const mondayBased = (jsDay - WEEK_START_MONDAY_INDEX + 7) % 7;
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - mondayBased);

  const todayIso = toIsoDate(new Date());
  const cells: CalendarCell[] = [];

  for (let index = 0; index < 42; index += 1) {
    const current = new Date(gridStart);
    current.setDate(gridStart.getDate() + index);
    const iso = toIsoDate(current);

    cells.push({
      date: current,
      iso,
      inCurrentMonth: current.getMonth() === monthDate.getMonth(),
      isToday: iso === todayIso,
    });
  }

  return cells;
}

export function shiftMonth(currentMonth: Date, delta: number): Date {
  return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + delta, 1);
}

export function prettyMonthTitle(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function prettyLongDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
