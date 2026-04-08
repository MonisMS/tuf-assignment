"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CircleDot,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  buildMonthGrid,
  isIsoInRange,
  normalizeRange,
  parseIsoDate,
  prettyLongDate,
  prettyMonthTitle,
  shiftMonth,
  toIsoDate,
} from "@/lib/calendar";

type NoteMode = "date" | "range";

type PersistedState = {
  monthIso: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  noteMode: NoteMode;
  dateNotes: Record<string, string>;
  rangeNotes: Record<string, string>;
};

const STORAGE_KEY = "wall-calendar-v1";
const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOLIDAYS: Record<string, string> = {
  "2026-01-01": "New Year's Day",
  "2026-07-04": "Independence Day",
  "2026-11-26": "Thanksgiving",
  "2026-12-25": "Christmas Day",
};

const HERO_THEMES = [
  {
    label: "Alpine",
    overlayClass: "bg-gradient-to-t from-sky-900/88 via-sky-700/35 to-cyan-100/15",
    accentClass: "from-cyan-200/45 to-transparent",
    badgeClass: "border-cyan-100/35 bg-cyan-100/20 text-cyan-50",
  },
  {
    label: "Canyon",
    overlayClass: "bg-gradient-to-t from-indigo-900/88 via-blue-700/32 to-amber-100/15",
    accentClass: "from-amber-200/45 to-transparent",
    badgeClass: "border-amber-100/35 bg-amber-100/20 text-amber-50",
  },
  {
    label: "Coast",
    overlayClass: "bg-gradient-to-t from-teal-900/88 via-sky-700/32 to-emerald-100/15",
    accentClass: "from-emerald-200/45 to-transparent",
    badgeClass: "border-emerald-100/35 bg-emerald-100/20 text-emerald-50",
  },
  {
    label: "Aurora",
    overlayClass: "bg-gradient-to-t from-violet-900/88 via-indigo-700/32 to-fuchsia-100/15",
    accentClass: "from-fuchsia-200/45 to-transparent",
    badgeClass: "border-fuchsia-100/35 bg-fuchsia-100/20 text-fuchsia-50",
  },
] as const;

type InitialState = {
  viewMonth: Date;
  rangeStart: string | null;
  rangeEnd: string | null;
  noteMode: NoteMode;
  dateNotes: Record<string, string>;
  rangeNotes: Record<string, string>;
};

function readInitialState(): InitialState {
  const fallback: InitialState = {
    viewMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    rangeStart: null,
    rangeEnd: null,
    noteMode: "date",
    dateNotes: {},
    rangeNotes: {},
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistedState;
    const parsedMonth = parsed.monthIso
      ? parseIsoDate(parsed.monthIso)
      : fallback.viewMonth;

    return {
      viewMonth: new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 1),
      rangeStart: parsed.rangeStart ?? null,
      rangeEnd: parsed.rangeEnd ?? null,
      noteMode: parsed.noteMode ?? "date",
      dateNotes: parsed.dateNotes ?? {},
      rangeNotes: parsed.rangeNotes ?? {},
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

function getRangeKey(start: string, end: string): string {
  const [from, to] = normalizeRange(start, end);
  return `${from}__${to}`;
}

export default function WallCalendar() {
  const initialState = useMemo(() => readInitialState(), []);
  const [viewMonth, setViewMonth] = useState<Date>(initialState.viewMonth);
  const [rangeStart, setRangeStart] = useState<string | null>(initialState.rangeStart);
  const [rangeEnd, setRangeEnd] = useState<string | null>(initialState.rangeEnd);
  const [activeDayIso, setActiveDayIso] = useState<string | null>(null);
  const [noteMode, setNoteMode] = useState<NoteMode>(initialState.noteMode);
  const [dateNotes, setDateNotes] = useState<Record<string, string>>(initialState.dateNotes);
  const [rangeNotes, setRangeNotes] = useState<Record<string, string>>(initialState.rangeNotes);
  const [draftByTarget, setDraftByTarget] = useState<Record<string, string>>({});
  const [savedPulse, setSavedPulse] = useState(false);
  const [focusedDayIso, setFocusedDayIso] = useState<string | null>(null);
  const [monthNavDirection, setMonthNavDirection] = useState<"forward" | "backward">(
    "forward",
  );
  const dayButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedState = {
      monthIso: toIsoDate(viewMonth),
      rangeStart,
      rangeEnd,
      noteMode,
      dateNotes,
      rangeNotes,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [viewMonth, rangeStart, rangeEnd, noteMode, dateNotes, rangeNotes]);

  const selectedRangeKey =
    rangeStart && rangeEnd ? getRangeKey(rangeStart, rangeEnd) : null;
  const noteTargetKey = noteMode === "date" ? activeDayIso : selectedRangeKey;

  const currentStoredNote = useMemo(() => {
    if (!noteTargetKey) return "";
    return noteMode === "date"
      ? dateNotes[noteTargetKey] ?? ""
      : rangeNotes[noteTargetKey] ?? "";
  }, [noteMode, noteTargetKey, dateNotes, rangeNotes]);

  const draftNote =
    noteTargetKey && Object.prototype.hasOwnProperty.call(draftByTarget, noteTargetKey)
      ? draftByTarget[noteTargetKey]
      : currentStoredNote;

  function handleDaySelection(iso: string): void {
    setActiveDayIso(iso);

    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(iso);
      setRangeEnd(null);
      return;
    }

    if (rangeStart === iso) {
      setRangeStart(null);
      setRangeEnd(null);
      return;
    }

    const [from, to] = normalizeRange(rangeStart, iso);
    setRangeStart(from);
    setRangeEnd(to);
  }

  function handleDayKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    iso: string,
  ): void {
    const key = event.key;

    if (key === "Enter" || key === " ") {
      event.preventDefault();
      handleDaySelection(iso);
      return;
    }

    if (key === "Escape") {
      event.preventDefault();
      clearSelection();
      return;
    }

    let nextIndex: number | null = null;
    if (key === "ArrowRight") nextIndex = index + 1;
    if (key === "ArrowLeft") nextIndex = index - 1;
    if (key === "ArrowDown") nextIndex = index + 7;
    if (key === "ArrowUp") nextIndex = index - 7;

    if (nextIndex === null) return;
    event.preventDefault();

    if (nextIndex < 0 || nextIndex > 41) return;
    dayButtonRefs.current[nextIndex]?.focus();
  }

  function clearSelection(): void {
    setRangeStart(null);
    setRangeEnd(null);
    setActiveDayIso(null);
  }

  function saveNote(): void {
    const value = draftNote.trim();

    if (noteMode === "date") {
      if (!activeDayIso) return;
      setDateNotes((current) => {
        const next = { ...current };
        if (value) {
          next[activeDayIso] = value;
        } else {
          delete next[activeDayIso];
        }
        return next;
      });
    } else {
      if (!selectedRangeKey) return;
      setRangeNotes((current) => {
        const next = { ...current };
        if (value) {
          next[selectedRangeKey] = value;
        } else {
          delete next[selectedRangeKey];
        }
        return next;
      });
    }

    setSavedPulse(true);
    window.setTimeout(() => setSavedPulse(false), 800);
  }

  function deleteNote(): void {
    if (noteTargetKey) {
      setDraftByTarget((current) => ({ ...current, [noteTargetKey]: "" }));
    }

    if (noteMode === "date") {
      if (!activeDayIso) return;
      setDateNotes((current) => {
        const next = { ...current };
        delete next[activeDayIso];
        return next;
      });
      return;
    }

    if (!selectedRangeKey) return;
    setRangeNotes((current) => {
      const next = { ...current };
      delete next[selectedRangeKey];
      return next;
    });
  }

  const selectedRangeLabel =
    rangeStart && rangeEnd
      ? `${prettyLongDate(rangeStart)} to ${prettyLongDate(rangeEnd)}`
      : rangeStart
        ? prettyLongDate(rangeStart)
        : "No days selected";

  const rangeNoteCount =
    rangeStart && rangeEnd
      ? Object.keys(dateNotes).filter((iso) => isIsoInRange(iso, rangeStart, rangeEnd)).length
      : 0;

  const quickTemplates = [
    "Review milestones",
    "Team sync 11:00",
    "Travel prep",
    "Personal errands",
  ];

  const activeNoteCount = Object.keys(dateNotes).length + Object.keys(rangeNotes).length;
  const heroTheme = HERO_THEMES[viewMonth.getMonth() % HERO_THEMES.length];
  const monthTitleKey = toIsoDate(viewMonth);
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const isViewingCurrentMonth =
    currentMonthStart.getFullYear() === viewMonth.getFullYear() &&
    currentMonthStart.getMonth() === viewMonth.getMonth();

  const hasRangeAnchor = Boolean(rangeStart);
  const hasCompleteRange = Boolean(rangeStart && rangeEnd);
  const rangeStatusLabel = hasCompleteRange
    ? "Range selected"
    : hasRangeAnchor
      ? "Start selected"
      : "No selection";
  const rangeStatusTone = hasCompleteRange
    ? "bg-emerald-100 text-emerald-700"
    : hasRangeAnchor
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";
  const focusedDayHasNote = focusedDayIso ? Boolean(dateNotes[focusedDayIso]) : false;
  const hasNoteTarget = Boolean(noteTargetKey);
  const noteCharacterCount = draftNote.length;
  const hasUnsavedNoteChanges = hasNoteTarget && draftNote !== currentStoredNote;

  function navigateMonth(delta: number): void {
    setMonthNavDirection(delta >= 0 ? "forward" : "backward");
    setViewMonth((current) => shiftMonth(current, delta));
  }

  function jumpToCurrentMonth(): void {
    if (isViewingCurrentMonth) return;
    setMonthNavDirection(viewMonth.getTime() <= currentMonthStart.getTime() ? "forward" : "backward");
    setViewMonth(currentMonthStart);
  }

  function handleNoteEditorKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>): void {
    const isSaveCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s";
    if (!isSaveCombo) return;
    event.preventDefault();
    if (!hasNoteTarget) return;
    saveNote();
  }

  return (
    <section className="premium-enter mx-auto flex h-full min-h-0 w-full max-w-7xl items-stretch px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div className="wall-sheet relative isolate flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[20px] border border-sky-100/70 bg-white/92 p-2.5 shadow-[0_35px_80px_rgba(3,37,65,0.22)] supports-backdrop-filter:backdrop-blur-[2px] sm:rounded-[24px] sm:p-4 md:p-5">
        <div className="mb-3 hidden justify-center gap-2 md:flex" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={`ring-${index}`}
              className="coil-ring h-3 w-3 rounded-full border border-slate-300 bg-slate-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]"
              style={{ animationDelay: `${index * 18}ms` }}
            />
          ))}
        </div>

        <div className="grid-scroll grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1 xl:grid-cols-[minmax(0,1.68fr)_minmax(300px,0.92fr)] xl:overflow-visible">
          <Card className="premium-panel panel-left flex min-h-102 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white py-0 ring-1 ring-slate-200/60 xl:min-h-0">
            <div className="hero-panel relative h-28 overflow-hidden rounded-t-3xl p-4 sm:h-32 sm:p-5 lg:h-36">
              <div className="absolute inset-0 bg-[url('/hero-calendar.svg')] bg-cover bg-center opacity-80" />
              <div className={`absolute inset-0 ${heroTheme.overlayClass}`} />
              <div className={`hero-orb absolute -right-14 top-2 h-24 w-24 rounded-full bg-linear-to-br blur-xl sm:h-28 sm:w-28 ${heroTheme.accentClass}`} />
              <div className="hero-shimmer absolute inset-0" aria-hidden="true" />
              <div className="relative z-10 flex h-full flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] tracking-[0.28em] text-sky-100 sm:text-[11px]">WALL CALENDAR</p>
                  <Badge className={`hero-badge hidden border text-[10px] tracking-[0.14em] uppercase backdrop-blur sm:inline-flex ${heroTheme.badgeClass}`}>
                    {heroTheme.label} issue
                  </Badge>
                </div>

                <div className="month-title-stage">
                  <h1
                    key={monthTitleKey}
                    data-dir={monthNavDirection}
                    className="month-title-swap mt-1 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl"
                  >
                    {prettyMonthTitle(viewMonth)}
                  </h1>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-sky-100/90">Select a range and capture monthly notes.</p>
                  <Badge className="hidden border-0 bg-white/20 text-white backdrop-blur sm:inline-flex">
                    Touch + Keyboard Ready
                  </Badge>
                </div>
              </div>
            </div>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4 md:p-5">
              <div className="toolbar-shell flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50/75 px-2 py-2 sm:px-3">
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth(-1)}
                    aria-label="Previous month"
                    className="micro-btn rounded-full"
                  >
                    <ChevronLeft className="size-4" />
                    Prev
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth(1)}
                    aria-label="Next month"
                    className="micro-btn rounded-full"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                  <Separator orientation="vertical" className="mx-0.5 h-5" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={jumpToCurrentMonth}
                    disabled={isViewingCurrentMonth}
                    aria-label="Jump to current month"
                    className="micro-btn rounded-full"
                  >
                    <LocateFixed className="size-4" />
                    Today
                  </Button>
                </div>

                <Badge variant="outline" className="toolbar-month-chip hidden rounded-full px-3 py-1 text-xs md:inline-flex">
                  {prettyMonthTitle(viewMonth)}
                </Badge>

                <div className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.12em] uppercase ${rangeStatusTone}`}>
                    {rangeStatusLabel}
                  </span>
                  <Badge variant="secondary" className="rounded-full">
                    <CalendarDays className="mr-1 size-3.5" /> {activeNoteCount} notes
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                    disabled={!hasRangeAnchor && !hasCompleteRange}
                    className="micro-btn rounded-full"
                  >
                    Clear Range
                  </Button>
                </div>
              </div>

              <div
                className="calendar-enter date-grid-surface grid min-h-0 flex-1 grid-cols-7 gap-1 rounded-2xl bg-[linear-gradient(160deg,#f7fafd_0%,#f2f7fb_100%)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-2"
                role="grid"
                aria-label={`Calendar month ${prettyMonthTitle(viewMonth)}`}
              >
                {WEEKDAY_HEADERS.map((weekday, weekdayIndex) => (
                  <div
                    key={weekday}
                    data-weekend={weekdayIndex >= 5}
                    className="weekday-head px-0.5 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:px-1 sm:py-2 sm:text-[11px]"
                  >
                    {weekday}
                  </div>
                ))}

                {monthCells.map((cell, index) => {
                  const isStart = rangeStart === cell.iso;
                  const isEnd = rangeEnd === cell.iso;
                  const inRange =
                    Boolean(rangeStart && rangeEnd) &&
                    isIsoInRange(cell.iso, rangeStart as string, rangeEnd as string);
                  const rangeRole =
                    isStart && isEnd
                      ? "single"
                      : isStart
                        ? "start"
                        : isEnd
                          ? "end"
                          : inRange
                            ? "middle"
                            : "none";
                  const hasDateNote = Boolean(dateNotes[cell.iso]);
                  const holidayName = HOLIDAYS[cell.iso];
                  const dayOfWeek = cell.date.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  let toneClass = "bg-white text-slate-900 hover:bg-sky-50";
                  if (!cell.inCurrentMonth) {
                    toneClass = "bg-slate-100 text-slate-400 hover:bg-slate-100";
                  }
                  if (inRange) {
                    toneClass = "bg-sky-100 text-slate-900 hover:bg-sky-200";
                  }
                  if (isStart || isEnd) {
                    toneClass = "bg-sky-600 text-white hover:bg-sky-600";
                  }

                  const ariaParts = [prettyLongDate(cell.iso)];
                  if (hasDateNote) ariaParts.push("has note");
                  if (holidayName) ariaParts.push(`holiday: ${holidayName}`);
                  if (rangeRole === "start") ariaParts.push("range start");
                  if (rangeRole === "end") ariaParts.push("range end");
                  if (rangeRole === "single") ariaParts.push("single day range");
                  if (rangeRole === "middle") ariaParts.push("within selected range");

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      ref={(element) => {
                        dayButtonRefs.current[index] = element;
                      }}
                      onClick={() => handleDaySelection(cell.iso)}
                      onFocus={() => setFocusedDayIso(cell.iso)}
                      onKeyDown={(event) => handleDayKeyDown(event, index, cell.iso)}
                      className={`calendar-cell relative aspect-square min-h-[2.35rem] rounded-lg border border-white/70 px-1.5 pb-1 pt-1 text-left shadow-[0_1px_0_rgba(255,255,255,0.7)] transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 sm:min-h-0 sm:rounded-xl sm:px-2 sm:pb-2 ${toneClass}`}
                      data-active={isStart || isEnd ? "bound" : inRange ? "range" : "none"}
                      data-range-role={rangeRole}
                      data-outside={!cell.inCurrentMonth}
                      data-weekend={isWeekend}
                      data-focused={focusedDayIso === cell.iso}
                      data-has-note={hasDateNote}
                      style={{ animationDelay: `${(index % 7) * 18}ms` }}
                      aria-label={ariaParts.join(", ")}
                      aria-selected={rangeRole !== "none"}
                      role="gridcell"
                    >
                      {cell.isToday && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
                      )}
                      {holidayName && (
                        <span
                          className="absolute left-1 top-1 rounded bg-rose-500/85 px-1 text-[8px] font-semibold text-white sm:text-[9px]"
                          title={holidayName}
                        >
                          H
                        </span>
                      )}

                      <span
                        className={`day-number text-[11px] font-semibold sm:text-sm ${isWeekend && !isStart && !isEnd ? "text-rose-500" : ""}`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {hasDateNote && (
                        <span
                          className={`absolute bottom-1 left-1.5 h-1.5 w-1.5 rounded-full ${isStart || isEnd ? "bg-white" : "bg-sky-500"}`}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="premium-panel panel-right flex min-h-80 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbfe_0%,#f3f7fb_100%)] py-0 ring-1 ring-slate-200/60 xl:min-h-0">
            <CardHeader className="space-y-1 pb-3 pt-4">
              <CardTitle className="text-xl">Notes</CardTitle>
              <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                <Sparkles className="size-4 text-sky-500" />
                Keep plans attached to dates or full ranges.
              </CardDescription>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 space-y-4 overflow-visible px-3 pb-3 sm:px-4 sm:pb-4 md:px-5 md:pb-5 xl:overflow-y-auto">
              <Tabs
                value={noteMode}
                onValueChange={(value) => setNoteMode(value === "range" ? "range" : "date")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 rounded-full" variant="default">
                  <TabsTrigger value="date" className="rounded-full">
                    Date Note
                  </TabsTrigger>
                  <TabsTrigger value="range" className="rounded-full">
                    Range Note
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">Selection</p>
                <p className="text-xs text-slate-700 sm:text-sm">{selectedRangeLabel}</p>

                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={`rounded-full text-[11px] ${hasNoteTarget ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}
                  >
                    <CircleDot className="mr-1 size-3.5" />
                    {hasNoteTarget ? "Target active" : "Select target"}
                  </Badge>
                  {hasUnsavedNoteChanges && (
                    <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-[11px] text-amber-700">
                      Unsaved changes
                    </Badge>
                  )}
                </div>

                {rangeStart && rangeEnd && (
                  <Badge variant="secondary" className="rounded-full text-[11px]">
                    {rangeNoteCount} day note{rangeNoteCount === 1 ? "" : "s"} in this range
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <label htmlFor="note-input" className="text-xs font-medium text-slate-700 sm:text-sm">
                  {noteMode === "date" ? "Selected day note" : "Selected range note"}
                </label>
                <Textarea
                  id="note-input"
                  value={draftNote}
                  onKeyDown={handleNoteEditorKeyDown}
                  onChange={(event) => {
                    if (!noteTargetKey) return;
                    const value = event.target.value;
                    setDraftByTarget((current) => ({ ...current, [noteTargetKey]: value }));
                  }}
                  placeholder={
                    noteMode === "date"
                      ? activeDayIso
                        ? `Write a note for ${prettyLongDate(activeDayIso)}`
                        : "Select a day to write a date note"
                      : selectedRangeKey
                        ? "Write a note for the selected range"
                        : "Select a full range to write a range note"
                  }
                  disabled={noteMode === "date" ? !activeDayIso : !selectedRangeKey}
                  className="min-h-24 resize-none rounded-2xl border-slate-200 bg-white/95 text-sm sm:min-h-28 sm:resize-y"
                />

                <div className="flex flex-wrap gap-1.5 max-sm:overflow-x-auto max-sm:pb-1">
                  {quickTemplates.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      size="xs"
                      variant="outline"
                      className="micro-btn rounded-full"
                      onClick={() => {
                        if (!noteTargetKey) return;
                        setDraftByTarget((current) => {
                          const existing = current[noteTargetKey] ?? currentStoredNote;
                          const spacer = existing.trim() ? "\n" : "";
                          return {
                            ...current,
                            [noteTargetKey]: `${existing}${spacer}${item}`,
                          };
                        });
                      }}
                    >
                      {item}
                    </Button>
                  ))}
                </div>

                <div className="notes-meta-row flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tip: Ctrl/Cmd + S to save quickly</span>
                  <span>{noteCharacterCount} chars</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={saveNote}
                  disabled={!hasNoteTarget || !hasUnsavedNoteChanges}
                  className={`rounded-full ${savedPulse ? "save-pulse" : "micro-btn"}`}
                >
                  <Save className="mr-1 size-4" />
                  {savedPulse ? "Saved" : hasUnsavedNoteChanges ? "Save Note" : "Saved"}
                </Button>
                <Button
                  type="button"
                  onClick={deleteNote}
                  variant="outline"
                  disabled={!hasNoteTarget || !currentStoredNote}
                  className="micro-btn rounded-full"
                >
                  <Trash2 className="mr-1 size-4" /> Delete
                </Button>
              </div>

              <div aria-live="polite" className="text-xs text-slate-600">
                {savedPulse
                  ? "Note saved successfully."
                  : focusedDayIso
                    ? `Focused: ${prettyLongDate(focusedDayIso)}${focusedDayHasNote ? ", has note" : ""}. Enter selects.`
                    : "Arrow keys move focus. Enter selects. Esc clears selection."}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
