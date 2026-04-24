'use client';

import { FormElementProps } from '@/types/form-element.types';
import { Plus, Trash2, CheckCircle2, Circle, Clock } from 'lucide-react';
import { useState } from 'react';

type Action = {
  id?: string;
  text: string;
  status: 'pending' | 'inprogress' | 'done' | 'skipped';
  due_time?: string;
};

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

  const getStatusIcon = (status: Action['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'inprogress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Circle className="w-4 h-4 text-neutral-400" />;
    }
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
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                {getStatusIcon(action.status)}
                <div className="flex-1">
                  <p className={`text-sm ${action.status === 'done' ? 'line-through text-neutral-500' : 'text-neutral-900'}`}>
                    {action.text}
                  </p>
                  {action.due_time && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Due: {new Date(action.due_time).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className="text-xs text-neutral-500 uppercase px-2 py-1 bg-white rounded border border-neutral-200">
                  {action.status}
                </span>
              </div>
            ))}
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
      <div className="space-y-2">
        {actions.map((action, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 bg-neutral-50 rounded-lg border border-neutral-200"
          >
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={action.text}
                onChange={(e) => updateAction(index, { text: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm bg-white"
                placeholder="Action description..."
              />
              <div className="flex items-center gap-2">
                <select
                  value={action.status}
                  onChange={(e) =>
                    updateAction(index, { status: e.target.value as Action['status'] })
                  }
                  className="px-2 py-1 text-xs border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                >
                  <option value="pending">Pending</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="skipped">Skipped</option>
                </select>
                <input
                  type="date"
                  value={action.due_time ? new Date(action.due_time).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    updateAction(index, { due_time: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                  }
                  className="px-2 py-1 text-xs border border-neutral-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeAction(index)}
              className="p-2 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>

      {/* Add new action */}
      <div className="flex gap-2">
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
          className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 text-sm"
        />
        <button
          type="button"
          onClick={addAction}
          className="px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors flex items-center gap-2"
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
