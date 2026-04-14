import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { purchasesApi } from '../../api/client';
import { PurchaseItem } from '../../types';
import { X, Save, ShoppingBag } from 'lucide-react';

interface AddPurchaseModalProps {
  item?: PurchaseItem;
  onClose: () => void;
  onSaved: () => void;
}

const initialForm = {
  name: '',
  category: 'SPORTS' as PurchaseItem['category'],
  subcategory: '',
  brand: '',
  colorway: '',
  estimatedPrice: '',
  targetPrice: '',
  priority: 'MEDIUM' as PurchaseItem['priority'],
  status: 'WISHLIST' as PurchaseItem['status'],
  notes: '',
  productLink: ''
};

export default function AddPurchaseModal({ item, onClose, onSaved }: AddPurchaseModalProps) {
  const [form, setForm] = useState({
    name: item?.name ?? initialForm.name,
    category: item?.category ?? initialForm.category,
    subcategory: item?.subcategory ?? initialForm.subcategory,
    brand: item?.brand ?? initialForm.brand,
    colorway: item?.colorway ?? initialForm.colorway,
    estimatedPrice: item?.estimatedPrice?.toString() ?? initialForm.estimatedPrice,
    targetPrice: item?.targetPrice?.toString() ?? initialForm.targetPrice,
    priority: item?.priority ?? initialForm.priority,
    status: item?.status ?? initialForm.status,
    notes: item?.notes ?? initialForm.notes,
    productLink: item?.productLink ?? initialForm.productLink
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const createMutation = useMutation({
    mutationFn: (data: Partial<PurchaseItem>) => purchasesApi.create(data),
    onSuccess: onSaved
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<PurchaseItem>) => purchasesApi.update(item!.id, data),
    onSuccess: onSaved
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const validate = () => {
    const errs: Partial<typeof form> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.estimatedPrice && isNaN(parseFloat(form.estimatedPrice))) errs.estimatedPrice = 'Must be a number';
    if (form.targetPrice && isNaN(parseFloat(form.targetPrice))) errs.targetPrice = 'Must be a number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: Partial<PurchaseItem> = {
      name: form.name.trim(),
      category: form.category,
      subcategory: form.subcategory.trim(),
      brand: form.brand.trim(),
      colorway: form.colorway.trim(),
      estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : undefined,
      targetPrice: form.targetPrice ? parseFloat(form.targetPrice) : undefined,
      priority: form.priority,
      status: form.status,
      notes: form.notes.trim(),
      productLink: form.productLink.trim() || null
    } as Partial<PurchaseItem>;

    if (item) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const update = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scale-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {item ? 'Edit Item' : 'Add Purchase Item'}
              </h2>
              <p className="text-xs text-slate-500">Track items on your wishlist</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="label">Item Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              className={`input-field w-full ${errors.name ? 'border-rose-500' : ''}`}
              placeholder="e.g. Nike Air Max 90"
              autoFocus
            />
            {errors.name && <p className="text-rose-400 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Category + Subcategory */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select
                value={form.category}
                onChange={e => update('category', e.target.value)}
                className="select-field w-full"
              >
                <option value="SPORTS">Sports</option>
                <option value="CLOTHING">Clothing</option>
                <option value="ACCESSORIES">Accessories</option>
                <option value="SUPPLEMENTS">Supplements</option>
              </select>
            </div>
            <div>
              <label className="label">Subcategory</label>
              <input
                type="text"
                value={form.subcategory}
                onChange={e => update('subcategory', e.target.value)}
                className="input-field w-full"
                placeholder="e.g. Running"
              />
            </div>
          </div>

          {/* Brand + Colorway */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Brand</label>
              <input
                type="text"
                value={form.brand}
                onChange={e => update('brand', e.target.value)}
                className="input-field w-full"
                placeholder="e.g. Nike"
              />
            </div>
            <div>
              <label className="label">Colorway</label>
              <input
                type="text"
                value={form.colorway}
                onChange={e => update('colorway', e.target.value)}
                className="input-field w-full"
                placeholder="e.g. White/Black"
              />
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Estimated Price (€)</label>
              <input
                type="number"
                value={form.estimatedPrice}
                onChange={e => update('estimatedPrice', e.target.value)}
                className={`input-field w-full ${errors.estimatedPrice ? 'border-rose-500' : ''}`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              {errors.estimatedPrice && <p className="text-rose-400 text-xs mt-1">{errors.estimatedPrice}</p>}
            </div>
            <div>
              <label className="label">Target Price (€)</label>
              <input
                type="number"
                value={form.targetPrice}
                onChange={e => update('targetPrice', e.target.value)}
                className={`input-field w-full ${errors.targetPrice ? 'border-rose-500' : ''}`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              {errors.targetPrice && <p className="text-rose-400 text-xs mt-1">{errors.targetPrice}</p>}
            </div>
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select
                value={form.priority}
                onChange={e => update('priority', e.target.value)}
                className="select-field w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={e => update('status', e.target.value)}
                className="select-field w-full"
              >
                <option value="WISHLIST">Wishlist</option>
                <option value="PLANNED">Planned</option>
                <option value="PURCHASED">Purchased</option>
              </select>
            </div>
          </div>

          {/* Product Link */}
          <div>
            <label className="label">Product Link</label>
            <input
              type="url"
              value={form.productLink}
              onChange={e => update('productLink', e.target.value)}
              className="input-field w-full"
              placeholder="https://..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Error from API */}
          {(createMutation.error || updateMutation.error) && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm">
              Failed to save. Please try again.
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2 flex-1 justify-center">
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : item ? 'Update Item' : 'Add Item'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
