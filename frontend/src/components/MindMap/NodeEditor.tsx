import { useState, useEffect, useRef } from 'react';
import { Check, X, Trash2, Plus, Euro } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  BALANCE: '#6366f1',
  INCOME: '#10b981',
  FIXED_COSTS: '#f43f5e',
  VARIABLE_SPENDING: '#f59e0b',
  SHOPPING: '#38bdf8'
};

interface NodeEditorProps {
  nodeId: string;
  initialName: string;
  initialValue: number;
  type: string;
  parentId: string | null;
  x: number;
  y: number;
  onSave: (name: string, value: number) => void;
  onDelete: () => void;
  onAddChild: () => void;
  onClose: () => void;
  isSaving: boolean;
}

export default function NodeEditor({
  initialName,
  initialValue,
  type,
  parentId,
  x,
  y,
  onSave,
  onDelete,
  onAddChild,
  onClose,
  isSaving
}: NodeEditorProps) {
  const [name, setName] = useState(initialName);
  const [value, setValue] = useState(initialValue.toString());
  const nameRef = useRef<HTMLInputElement>(null);
  const color = TYPE_COLORS[type] || '#64748b';

  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
  }, []);

  const handleSave = () => {
    const numValue = parseFloat(value) || 0;
    onSave(name.trim() || initialName, numValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 z-20" onClick={onClose} />

      {/* Editor popup */}
      <div
        className="absolute z-30 animate-scale-in"
        style={{ left: Math.max(10, Math.min(x - 120, window.innerWidth - 270)), top: Math.max(10, y) }}
      >
        <div className="bg-zinc-900 border rounded-xl shadow-2xl p-4 w-60"
          style={{ borderColor: `${color}40` }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium text-slate-400">{type.replace('_', ' ')}</span>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Name field */}
          <div className="mb-3">
            <label className="text-xs text-slate-400 mb-1 block">Label</label>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field w-full text-sm"
              placeholder="Node name"
            />
          </div>

          {/* Value field */}
          <div className="mb-4">
            <label className="text-xs text-slate-400 mb-1 block">Value (€)</label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="input-field w-full text-sm pl-8"
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: `${color}20`, color, borderColor: `${color}40`, border: '1px solid' }}
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={onAddChild}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-slate-700"
              title="Add sub-item"
            >
              <Plus className="w-4 h-4" />
            </button>
            {parentId && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-slate-700"
                title="Delete node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
