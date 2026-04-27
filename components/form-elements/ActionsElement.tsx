'use client';

import { FormElementProps } from '@/types/form-element.types';
import { Plus, Trash2, CheckCircle2, Circle, Clock, ChevronDown, Ban, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';

type Action = {
  id?: string;
  text: string;
  status: 'pending' | 'inprogress' | 'done' | 'skipped';
  due_time?: string;
};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', icon: Circle, color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'inprogress', label: 'In Progress', icon: Clock, color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: '#10B981', bg: '#D1FAE5' },
  { value: 'skipped', label: 'Skipped', icon: Ban, color: '#6B7280', bg: '#F3F4F6' },
] as const;

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerProps {
  value?: string;
  onChange: (date: string | undefined) => void;
  onClose: () => void;
}

function DatePickerDropdown({ value, onChange, onClose }: DatePickerProps) {
  const selectedDate = value ? new Date(value) : null;
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get padding days for start of month
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
    <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-neutral-200 p-3 z-50 w-64">
      {/* Header */}
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

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-neutral-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {paddingDays.map((_, i) => (
          <div key={`pad-${i}`} className="w-8 h-8" />
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

      {/* Footer */}
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
 * Actions Element
 * Inline repeater for action items
 * Syncs with actions table on idea save
 */
export default function ActionsElement({
  config,
  value,
  onChange,
  mode,
}: FormElementProps) {
  const actions: Action[] = value || [];
  const [newActionText, setNewActionText] = useState('');
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setOpenDatePicker(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addAction = () => {
    if (!newActionText.trim()) return;

    const newAction: Action = {
      text: newActionText,
      status: 'pending',
    };

    onChange([...actions, newAction]);
    setNewActionText('');
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<Action>) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  if (mode === 'view') {
    return (
      <div className="space-y-3">
        <label className="text-sm font-medium text-neutral-700">
          {config.label}
        </label>
        {actions.length === 0 ? (
          <p className="text-sm text-neutral-400">No actions added</p>
        ) : (
          <div className="space-y-2">
            {actions.map((action, index) => {
              const statusOption = STATUS_OPTIONS.find(s => s.value === action.status);
              const Icon = statusOption?.icon || Circle;
              return (
                <div
                  key={index}
                  className="relative flex items-start gap-3 p-3 bg-white rounded-xl border border-neutral-200"
                >
                  {/* Left accent bar */}
                  <div
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                    style={{ backgroundColor: statusOption?.color }}
                  />
                  <div className="flex-1 pl-2">
                    <p className={`text-sm ${action.status === 'done' ? 'line-through text-neutral-500' : 'text-neutral-900'}`}>
                      {action.text}
                    </p>
                    {action.due_time && (
                      <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(action.due_time), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: statusOption?.bg, color: statusOption?.color }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {statusOption?.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-neutral-900">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Actions list */}
      <div className="space-y-3">
        {actions.map((action, index) => {
          const statusOption = STATUS_OPTIONS.find(s => s.value === action.status);
          return (
          <div
            key={index}
            className="relative flex items-start gap-3 p-4 bg-white rounded-xl border border-neutral-200 shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Left accent bar */}
            <div
              className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
              style={{ backgroundColor: statusOption?.color }}
            />

            <div className="flex-1 space-y-3 pl-2">
              <input
                type="text"
                value={action.text}
                onChange={(e) => updateAction(index, { text: e.target.value })}
                className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm bg-neutral-50 hover:bg-white transition-colors"
                placeholder="Action description..."
              />
              <div className="flex items-center gap-2 flex-wrap">
                {/* Custom Status Dropdown */}
                <div className="relative" ref={openDropdown === index ? dropdownRef : null}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDropdown(openDropdown === index ? null : index);
                      setOpenDatePicker(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium"
                    style={{
                      backgroundColor: statusOption?.bg,
                      borderColor: statusOption?.color + '40',
                    }}
                  >
                    {(() => {
                      const Icon = statusOption?.icon || Circle;
                      return (
                        <>
                          <Icon className="w-3.5 h-3.5" style={{ color: statusOption?.color }} />
                          <span style={{ color: statusOption?.color }}>{statusOption?.label}</span>
                          <ChevronDown className="w-3 h-3 ml-1" style={{ color: statusOption?.color }} />
                        </>
                      );
                    })()}
                  </button>

                  {/* Status Dropdown Menu */}
                  {openDropdown === index && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-white rounded-xl shadow-lg border border-neutral-200 py-1 z-50 overflow-hidden">
                      {STATUS_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const isSelected = action.status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              updateAction(index, { status: option.value as Action['status'] });
                              setOpenDropdown(null);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                              isSelected ? 'bg-neutral-50' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: option.bg }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: option.color }} />
                            </div>
                            <span className={`font-medium ${isSelected ? 'text-neutral-900' : 'text-neutral-700'}`}>
                              {option.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 ml-auto text-neutral-900" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Custom Date Picker */}
                <div className="relative flex items-center" ref={openDatePicker === index ? datePickerRef : null}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenDatePicker(openDatePicker === index ? null : index);
                      setOpenDropdown(null);
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 border transition-all text-xs font-medium ${
                      action.due_time
                        ? 'bg-blue-50 border-blue-200 text-blue-700 rounded-l-lg border-r-0'
                        : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-300 rounded-lg'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {action.due_time
                        ? format(new Date(action.due_time), 'MMM d, yyyy')
                        : 'Set due date'}
                    </span>
                    {!action.due_time && <ChevronDown className="w-3 h-3 ml-1" />}
                  </button>

                  {/* Clear button - separate from main button */}
                  {action.due_time && (
                    <button
                      type="button"
                      onClick={() => updateAction(index, { due_time: undefined })}
                      className="flex items-center justify-center px-2 py-1.5 bg-blue-50 border border-blue-200 border-l-0 rounded-r-lg text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      <X className="w-3.5 h-4" />
                    </button>
                  )}

                  {/* Date Picker Dropdown */}
                  {openDatePicker === index && (
                    <DatePickerDropdown
                      value={action.due_time}
                      onChange={(date) => updateAction(index, { due_time: date })}
                      onClose={() => setOpenDatePicker(null)}
                    />
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeAction(index)}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
            >
              <Trash2 className="w-4 h-4 text-neutral-400 group-hover:text-red-500 transition-colors" />
            </button>
          </div>
        );
        })}
      </div>

      {/* Add new action */}
      <div className="flex gap-2 p-3 bg-neutral-50 rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-300 transition-colors">
        <input
          type="text"
          value={newActionText}
          onChange={(e) => setNewActionText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAction();
            }
          }}
          placeholder="Add a new action..."
          className="flex-1 px-3 py-2.5 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent text-sm"
        />
        <button
          type="button"
          onClick={addAction}
          disabled={!newActionText.trim()}
          className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {config.placeholder && (
        <p className="text-xs text-neutral-500">{config.placeholder}</p>
      )}
    </div>
  );
}
