'use client';

import { FormElementProps } from '@/types/form-element.types';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerDropdownProps {
  value?: string;
  onChange: (date: string | undefined) => void;
  onClose: () => void;
}

function DatePickerDropdown({ value, onChange, onClose }: DatePickerDropdownProps) {
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = monthStart.getDay();
  const paddingDays = Array(startPadding).fill(null);

  const handleSelectDate = (date: Date) => {
    onChange(date.toISOString());
    onClose();
  };

  const handleClear = () => {
    onChange(undefined);
    onClose();
  };

  const handleToday = () => {
    onChange(new Date().toISOString());
    onClose();
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3 z-50 w-full">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setViewDate(subMonths(viewDate, 1))}
          className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-600" />
        </button>
        <span className="text-sm font-semibold text-neutral-900">
          {format(viewDate, 'MMMM yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setViewDate(addMonths(viewDate, 1))}
          className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-neutral-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-neutral-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, index) => (
          <div key={`pad-${index}`} className="w-8 h-8" />
        ))}

        {days.map((day) => {
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleSelectDate(day)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-all flex items-center justify-center ${
                isSelected
                  ? 'bg-neutral-900 text-white'
                  : isTodayDate
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-100">
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={handleToday}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          Today
        </button>
      </div>
    </div>
  );
}

/**
 * Due Date Element
 * Date picker for idea-level deadlines
 * Stores value in ideas.due_date column
 */
export default function DueDateElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  const dateValue = value ? new Date(value) : null;
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (mode === 'view') {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        {dateValue ? (
          <div className="flex items-center gap-2 text-neutral-900">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <span>{format(dateValue, 'PPP')}</span>
          </div>
        ) : (
          <p className="text-sm text-neutral-400">No due date set</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block space-y-2 w-full max-w-65" ref={wrapperRef}>
      <label className="text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-neutral-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 focus:ring-offset-white shadow-sm transition-all"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <span className={dateValue ? 'text-neutral-900 text-sm' : 'text-neutral-400 text-sm'}>
            {dateValue ? format(dateValue, 'PPP') : config.placeholder || 'Select a due date'}
          </span>
        </div>
        <span className="text-xs text-neutral-400">▼</span>
      </button>

      {isOpen && (
        <DatePickerDropdown
          value={value}
          onChange={(date) => onChange(date || null)}
          onClose={() => setIsOpen(false)}
        />
      )}

      {config.placeholder && (
        <p className="text-xs text-neutral-500">{config.placeholder}</p>
      )}
    </div>
  );
}
