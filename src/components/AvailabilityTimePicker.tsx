import React, { useEffect, useState } from 'react';
import { Clock, CalendarDays } from 'lucide-react';
import {
  AvailabilityMode,
  buildAvailabilityString,
  getTodayISO,
  isValidTimeRange,
  parseAvailabilityString,
  TIME_PRESETS,
} from '../utils/availability';
import { CalendarDatePicker } from './CalendarDatePicker';

interface AvailabilityTimePickerProps {
  idPrefix: string;
  label?: string;
  value: string;
  onChange: (nextValue: string) => void;
  allowEmpty?: boolean;
  requireDate?: boolean;
  helperText?: string;
}

export function AvailabilityTimePicker({
  idPrefix,
  label = 'Date & Time',
  value,
  onChange,
  allowEmpty = false,
  requireDate = false,
  helperText,
}: AvailabilityTimePickerProps) {
  const todayISO = getTodayISO();
  const initial = parseAvailabilityString(
    value,
    '19:00',
    '21:00',
    requireDate ? todayISO : ''
  );

  const [mode, setMode] = useState<AvailabilityMode>(() => {
    if (!value.trim()) return allowEmpty ? 'unset' : 'time';
    return initial.mode;
  });
  const [date, setDate] = useState<string>(() => {
    if (initial.date) return initial.date;
    return requireDate && initial.mode === 'time' ? todayISO : '';
  });
  const [startTime, setStartTime] = useState<string>(initial.startTime);
  const [endTime, setEndTime] = useState<string>(initial.endTime);

  // Sync if parent updates value externally (e.g. loading an existing request for edit)
  useEffect(() => {
    const currentFormatted = buildAvailabilityString(mode, date, startTime, endTime);
    if (value.trim() !== currentFormatted.trim()) {
      const parsed = parseAvailabilityString(
        value,
        '19:00',
        '21:00',
        requireDate ? todayISO : ''
      );
      if (!value.trim()) {
        setMode(allowEmpty ? 'unset' : 'time');
        setDate(requireDate ? todayISO : '');
      } else {
        setMode(parsed.mode);
        setDate(parsed.date);
        setStartTime(parsed.startTime);
        setEndTime(parsed.endTime);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emitChange = (
    nextMode: AvailabilityMode,
    nextDate: string,
    nextStart: string,
    nextEnd: string
  ) => {
    setMode(nextMode);
    setDate(nextDate);
    setStartTime(nextStart);
    setEndTime(nextEnd);
    onChange(buildAvailabilityString(nextMode, nextDate, nextStart, nextEnd));
  };

  const rangeValid = mode !== 'time' || isValidTimeRange(startTime, endTime);
  const dateMissing = mode === 'time' && requireDate && !date;
  const preview = buildAvailabilityString(mode, date, startTime, endTime);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="block text-sm font-medium text-slate-800">{label}</span>

        <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200/80">
          <button
            type="button"
            onClick={() =>
              emitChange('time', date || (requireDate ? todayISO : ''), startTime, endTime)
            }
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'time'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pick Date &amp; Time
          </button>
          <button
            type="button"
            onClick={() => emitChange('flexible', '', startTime, endTime)}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              mode === 'flexible'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flexible
          </button>
          {allowEmpty && mode !== 'unset' && (
            <button
              type="button"
              onClick={() => emitChange('unset', '', startTime, endTime)}
              className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {mode === 'unset' ? (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-dashed border-slate-300">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
            <span>No availability date or time set yet.</span>
          </div>
          <button
            type="button"
            onClick={() =>
              emitChange('time', requireDate ? todayISO : '', startTime, endTime)
            }
            className="shrink-0 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
          >
            Set date &amp; time
          </button>
        </div>
      ) : mode === 'time' ? (
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor={`${idPrefix}-date`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1"
              >
                <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <CalendarDatePicker
                id={`${idPrefix}-date`}
                value={date}
                onChange={(nextDate) => emitChange('time', nextDate, startTime, endTime)}
                minDate={todayISO}
                allowClear={!requireDate}
                placeholder={requireDate ? 'Choose date' : 'Any date (optional)'}
              />
            </div>

            <div>
              <label
                htmlFor={`${idPrefix}-start-time`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                From
              </label>
              <input
                id={`${idPrefix}-start-time`}
                type="time"
                required={!allowEmpty}
                value={startTime}
                onChange={(e) => emitChange('time', date, e.target.value, endTime)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor={`${idPrefix}-end-time`}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1"
              >
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                To
              </label>
              <input
                id={`${idPrefix}-end-time`}
                type="time"
                required={!allowEmpty}
                value={endTime}
                onChange={(e) => emitChange('time', date, startTime, e.target.value)}
                className={`w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border rounded-lg focus:outline-none focus:ring-2 ${
                  rangeValid
                    ? 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
                    : 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                }`}
              />
            </div>
          </div>

          {dateMissing ? (
            <p className="text-xs font-medium text-rose-700">
              Please click the calendar above to choose a date.
            </p>
          ) : !rangeValid ? (
            <p className="text-xs font-medium text-rose-700">
              End time must be later than start time.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <span className="text-slate-600">
                Scheduled for:{' '}
                <strong className="font-semibold text-slate-900">{preview}</strong>
              </span>
            </div>
          )}

          {/* Quick time presets */}
          <div className="pt-2 border-t border-slate-200/80">
            <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
              Quick time slots
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TIME_PRESETS.map((preset) => {
                const active = startTime === preset.start && endTime === preset.end;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => emitChange('time', date, preset.start, preset.end)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                      active
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-600">
            Flexible schedule — open to coordinating date &amp; time with your partner.
          </span>
          <span className="text-xs font-semibold text-slate-900">Flexible</span>
        </div>
      )}

      {helperText && <p className="text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
