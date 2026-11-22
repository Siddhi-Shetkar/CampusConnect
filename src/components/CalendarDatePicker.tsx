import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  addDaysISO,
  formatDateISOToDisplay,
  FULL_MONTHS,
  getTodayISO,
  isValidDateISO,
  toLocalDateISO,
} from '../utils/availability';

interface CalendarDatePickerProps {
  id?: string;
  value: string; // YYYY-MM-DD or ''
  onChange: (nextDateISO: string) => void;
  minDate?: string; // YYYY-MM-DD
  allowClear?: boolean;
  placeholder?: string;
  compact?: boolean;
}

const WEEKDAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] as const;

export function CalendarDatePicker({
  id,
  value,
  onChange,
  minDate,
  allowClear = false,
  placeholder = 'Select date',
  compact = false,
}: CalendarDatePickerProps) {
  const todayISO = getTodayISO();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initialRefDate = (() => {
    const base = isValidDateISO(value) ? value : todayISO;
    const [y, m] = base.split('-').map(Number);
    return { year: y, month: m - 1 }; // month is 0-indexed
  })();

  const [viewYear, setViewYear] = useState(initialRefDate.year);
  const [viewMonth, setViewMonth] = useState(initialRefDate.month);

  useEffect(() => {
    if (isValidDateISO(value)) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      iso: toLocalDateISO(new Date(viewYear, viewMonth, day)),
      day,
    });
  }

  const selectDate = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };

  const displayLabel = isValidDateISO(value) ? formatDateISOToDisplay(value) : '';
  const tomorrowISO = addDaysISO(todayISO, 1);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`w-full flex items-center justify-between gap-2 text-left bg-white border rounded-lg transition-colors cursor-pointer ${
          open
            ? 'border-indigo-600 ring-2 ring-indigo-100'
            : 'border-slate-300 hover:border-slate-400'
        } ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <CalendarDays
            className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-indigo-600 shrink-0`}
          />
          <span className={displayLabel ? 'text-slate-900 font-medium truncate' : 'text-slate-400 truncate'}>
            {displayLabel || placeholder}
          </span>
        </span>
        {allowClear && displayLabel && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onChange('');
              }
            }}
            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 mt-2 z-30 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3.5 select-none"
        >
          {/* Month / Year header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-900">
              {FULL_MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAY_HEADERS.map((wd) => (
              <div
                key={wd}
                className="text-center text-[11px] font-semibold text-slate-400 py-1"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Calendar day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }
              const isSelected = cell.iso === value;
              const isToday = cell.iso === todayISO;
              const isDisabled = Boolean(minDate && cell.iso < minDate);

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => selectDate(cell.iso)}
                  aria-label={formatDateISOToDisplay(cell.iso)}
                  aria-pressed={isSelected}
                  className={`h-8 w-full rounded-lg text-xs font-medium tabular-nums transition-colors ${
                    isSelected
                      ? 'bg-indigo-700 text-white font-semibold shadow-xs cursor-pointer'
                      : isDisabled
                      ? 'text-slate-300 cursor-not-allowed'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-800 font-semibold ring-1 ring-inset ring-indigo-200 hover:bg-indigo-100 cursor-pointer'
                      : 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Quick date shortcuts */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={Boolean(minDate && todayISO < minDate)}
                onClick={() => selectDate(todayISO)}
                className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer disabled:opacity-40"
              >
                Today
              </button>
              <button
                type="button"
                disabled={Boolean(minDate && tomorrowISO < minDate)}
                onClick={() => selectDate(tomorrowISO)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer disabled:opacity-40"
              >
                Tomorrow
              </button>
            </div>
            {allowClear && (
              <button
                type="button"
                onClick={() => selectDate('')}
                className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Any date
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
