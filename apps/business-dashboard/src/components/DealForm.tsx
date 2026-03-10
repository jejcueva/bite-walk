'use client';

import { useState, FormEvent } from 'react';

const SUBCATEGORIES = [
  'Food & Drink',
  'Shopping',
  'Entertainment',
  'Health & Beauty',
  'Travel',
  'Services',
  'Education',
  'Sports & Fitness',
  'Other',
];

export interface DealFormData {
  title: string;
  description: string;
  points_cost: number;
  discount_percent: number;
  subcategory: string;
  image_url: string;
  is_active: boolean;
}

interface DealFormProps {
  initialData?: Partial<DealFormData>;
  onSubmit: (data: DealFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function DealForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
}: DealFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? '',
  );
  const [pointsCost, setPointsCost] = useState(
    initialData?.points_cost ?? 100,
  );
  const [discountPercent, setDiscountPercent] = useState(
    initialData?.discount_percent ?? 10,
  );
  const [subcategory, setSubcategory] = useState(
    initialData?.subcategory ?? SUBCATEGORIES[0],
  );
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      title,
      description,
      points_cost: pointsCost,
      discount_percent: discountPercent,
      subcategory,
      image_url: imageUrl,
      is_active: isActive,
    });
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2f7f65] focus:outline-none focus:ring-2 focus:ring-[#2f7f65]/30 transition-colors';
  const labelCls = 'mb-1 block text-sm font-medium text-slate-700';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelCls}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          required
          placeholder="e.g. 20% Off Coffee"
        />
      </div>

      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder="Describe what the customer gets..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Points Cost</label>
          <input
            type="number"
            min={0}
            value={pointsCost}
            onChange={(e) => setPointsCost(Number(e.target.value))}
            className={inputCls}
            required
          />
        </div>
        <div>
          <label className={labelCls}>Discount %</label>
          <input
            type="number"
            min={0}
            max={100}
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Number(e.target.value))}
            className={inputCls}
            required
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>Subcategory</label>
        <select
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          className={inputCls}
        >
          {SUBCATEGORIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Image URL</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={inputCls}
          placeholder="https://..."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            isActive ? 'bg-[#2f7f65]' : 'bg-slate-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              isActive ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
        <span className="text-sm text-slate-700">Active</span>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-[#2f7f65] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#266a54] disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialData ? 'Update Deal' : 'Create Deal'}
        </button>
      </div>
    </form>
  );
}
