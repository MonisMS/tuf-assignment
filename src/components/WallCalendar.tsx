"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  return (
    <section className="mx-auto flex h-full w-full max-w-6xl items-stretch px-2 py-2 sm:px-3 sm:py-3 lg:px-4 lg:py-4">
      <div className="wall-sheet flex h-full w-full flex-col overflow-hidden rounded-[22px] border border-sky-100 bg-white/95 p-3 shadow-[0_35px_80px_rgba(3,37,65,0.2)] sm:p-4 md:p-5">
        <div className="mb-3 hidden justify-center gap-2 md:flex" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={`ring-${index}`}
              className="h-3 w-3 rounded-full border border-slate-300 bg-slate-100"
            />
          ))}
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.95fr)]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="hero-panel relative h-24 overflow-hidden rounded-t-3xl p-4 sm:h-28 sm:p-5 lg:h-32">
              <div className="absolute inset-0 bg-[url('/hero-calendar.svg')] bg-cover bg-center opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-sky-700/90 via-sky-700/30 to-slate-50/30" />
              <div className="relative z-10 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.28em] text-sky-100 sm:text-[11px]">WALL CALENDAR</p>
                  <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl lg:text-4xl">
                    {prettyMonthTitle(viewMonth)}
                  </h1>
                </div>
                <p className="hidden rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur sm:block">
                  Touch + Keyboard Ready
                </p>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-4 md:p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-4">
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setViewMonth((current) => shiftMonth(current, -1))}
                    className="rounded-full px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                    aria-label="Previous month"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth((current) => shiftMonth(current, 1))}
                    className="rounded-full px-3 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
                    aria-label="Next month"
                  >
                    Next
                  </button>
                </div>

                <button
                  type="button"
                  onClick={clearSelection}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:text-sm"
                >
                  Clear Range
                </button>
              </div>

              <div className="calendar-enter grid min-h-0 flex-1 grid-cols-7 gap-1 rounded-2xl bg-slate-50 p-1 sm:p-2">
                {WEEKDAY_HEADERS.map((weekday) => (
                  <div
                    key={weekday}
                    className="px-0.5 py-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 sm:px-1 sm:py-2 sm:text-[11px]"
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

                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      ref={(element) => {
                        dayButtonRefs.current[index] = element;
                      }}
                      onClick={() => handleDaySelection(cell.iso)}
                      onKeyDown={(event) => handleDayKeyDown(event, index, cell.iso)}
                      className={`relative aspect-square min-h-0 rounded-lg border border-transparent px-1.5 pb-1 pt-1 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-600 sm:rounded-xl sm:px-2 sm:pb-2 ${toneClass}`}
                      aria-label={ariaParts.join(", ")}
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
                        className={`text-[11px] font-semibold sm:text-sm ${isWeekend && !isStart && !isEnd ? "text-rose-500" : ""}`}
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
            </div>
          </div>

          <aside className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-4 md:p-5">
            <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Notes</h2>

            <div className="mt-3 grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1">
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition sm:text-sm ${
                  noteMode === "date" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setNoteMode("date")}
              >
                Date Note
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  noteMode === "range"
                    ? "bg-sky-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setNoteMode("range")}
              >
                Range Note
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">Selection</p>
              <p className="mt-1 text-xs text-slate-700 sm:text-sm">{selectedRangeLabel}</p>

              {rangeStart && rangeEnd && (
                <p className="mt-2 text-xs text-slate-500">
                  {rangeNoteCount} day note{rangeNoteCount === 1 ? "" : "s"} inside current range
                </p>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="note-input" className="text-xs font-medium text-slate-700 sm:text-sm">
                {noteMode === "date" ? "Selected day note" : "Selected range note"}
              </label>
              <textarea
                id="note-input"
                value={draftNote}
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
                className="mt-2 min-h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-sky-600 transition placeholder:text-slate-400 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 sm:min-h-28 sm:resize-y"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveNote}
                disabled={noteMode === "date" ? !activeDayIso : !selectedRangeKey}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:text-sm ${
                  savedPulse
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-900 text-white hover:bg-slate-700"
                } disabled:cursor-not-allowed disabled:bg-slate-300`}
              >
                {savedPulse ? "Saved" : "Save Note"}
              </button>
              <button
                type="button"
                onClick={deleteNote}
                className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:text-sm"
              >
                Delete
              </button>
            </div>

            <div className="mt-4 hidden rounded-2xl border border-slate-200 bg-white p-3 md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.11em] text-slate-500">Keyboard</p>
              <p className="mt-1 text-sm text-slate-700">
                Arrow keys move focus. Enter selects. Esc clears the current selection.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
