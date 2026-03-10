'use client';

import { useEffect, useState, useRef, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';

const CATEGORIES = [
  'Restaurant',
  'Cafe',
  'Bar & Lounge',
  'Bakery',
  'Fast Food',
  'Fine Dining',
  'Food Truck',
  'Grocery',
  'Retail',
  'Health & Wellness',
  'Entertainment',
  'Services',
  'Other',
];

interface BusinessProfile {
  id: string;
  name: string;
  description: string;
  address: string;
  category: string;
  logo_url: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('id, name, description, address, category, logo_url')
        .eq('owner_id', user.id)
        .single();

      if (business) {
        setProfile(business);
        setName(business.name ?? '');
        setDescription(business.description ?? '');
        setAddress(business.address ?? '');
        setCategory(business.category ?? CATEGORIES[0]);
        setLogoUrl(business.logo_url);
        setLogoPreview(business.logo_url);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogoUpload(file: File) {
    if (!profile) return;
    setUploading(true);
    setMessage(null);

    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${profile.id}/logo-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('business-assets')
      .upload(path, file, { upsert: true });

    if (error) {
      setMessage({ type: 'error', text: 'Failed to upload logo.' });
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('business-assets').getPublicUrl(path);

    setLogoUrl(publicUrl);
    setLogoPreview(publicUrl);
    setUploading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    handleLogoUpload(file);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase
      .from('businesses')
      .update({
        name,
        description,
        address,
        category,
        logo_url: logoUrl,
      })
      .eq('id', profile.id);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save profile.' });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2f7f65] border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-500">
          No business profile found. Please contact support.
        </p>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2f7f65] focus:outline-none focus:ring-2 focus:ring-[#2f7f65]/30 transition-colors';
  const labelCls = 'mb-1.5 block text-sm font-medium text-slate-700';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Business Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Update your business information visible to BiteWalk users.
        </p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-8">
        {/* Logo Section */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">Logo</h2>
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Business logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <svg
                  className="h-8 w-8 text-slate-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                  />
                </svg>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Change Logo'}
              </button>
              <p className="mt-1.5 text-xs text-slate-400">
                JPG, PNG or WebP. Recommended 256x256px.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Business Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Business Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Business Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                required
                placeholder="Your business name"
              />
            </div>

            <div>
              <label className={labelCls}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={4}
                placeholder="Tell customers about your business..."
              />
            </div>

            <div>
              <label className={labelCls}>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputCls}
                placeholder="123 Main Street, City, State"
              />
            </div>

            <div>
              <label className={labelCls}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset'
                : 'bg-red-50 text-red-700 ring-1 ring-red-600/20 ring-inset'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#2f7f65] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#266a54] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
