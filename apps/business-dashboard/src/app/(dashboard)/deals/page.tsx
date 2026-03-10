'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import DealForm, { type DealFormData } from '@/components/DealForm';

interface Deal {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  discount_percent: number;
  subcategory: string;
  image_url: string;
  is_active: boolean;
  created_at: string;
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDeals = useCallback(async (bizId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });
    setDeals(data ?? []);
  }, []);

  useEffect(() => {
    async function init() {
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
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) {
        setLoading(false);
        return;
      }

      setBusinessId(business.id);
      await fetchDeals(business.id);
      setLoading(false);
    }
    init();
  }, [fetchDeals]);

  async function handleSubmit(data: DealFormData) {
    if (!businessId) return;
    setSubmitting(true);
    const supabase = createClient();

    if (editingDeal) {
      await supabase.from('deals').update(data).eq('id', editingDeal.id);
    } else {
      await supabase
        .from('deals')
        .insert({ ...data, business_id: businessId });
    }

    setShowForm(false);
    setEditingDeal(null);
    setSubmitting(false);
    await fetchDeals(businessId);
  }

  async function toggleActive(deal: Deal) {
    const supabase = createClient();
    await supabase
      .from('deals')
      .update({ is_active: !deal.is_active })
      .eq('id', deal.id);
    if (businessId) await fetchDeals(businessId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Deals
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage deals for BiteWalk users.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDeal(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-[#2f7f65] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#266a54]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Deal
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3">Title</th>
              <th className="px-6 py-3">Points Cost</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Subcategory</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {deals.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  No deals yet. Create your first deal to get started.
                </td>
              </tr>
            ) : (
              deals.map((deal, i) => (
                <tr
                  key={deal.id}
                  className={i % 2 === 1 ? 'bg-slate-50/50' : ''}
                >
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {deal.title}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {deal.points_cost}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        deal.is_active
                          ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset'
                          : 'bg-slate-100 text-slate-500 ring-1 ring-slate-500/10 ring-inset'
                      }`}
                    >
                      {deal.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {deal.subcategory}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(deal.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingDeal(deal);
                          setShowForm(true);
                        }}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleActive(deal)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          deal.is_active
                            ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                            : 'border-[#2f7f65]/30 text-[#2f7f65] hover:bg-[#2f7f65]/5'
                        }`}
                      >
                        {deal.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingDeal ? 'Edit Deal' : 'Create Deal'}
              </h2>
            </div>
            <div className="p-6">
              <DealForm
                initialData={editingDeal ?? undefined}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDeal(null);
                }}
                loading={submitting}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
