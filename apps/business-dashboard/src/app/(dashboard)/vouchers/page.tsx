'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';

type FilterStatus = 'all' | 'active' | 'used' | 'expired';

interface Voucher {
  id: string;
  deal_id: string;
  user_id: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  deals: { title: string; business_id: string };
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [validating, setValidating] = useState<string | null>(null);
  const businessIdRef = useRef<string | null>(null);

  const fetchVouchers = useCallback(async (bizId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('vouchers')
      .select(
        'id, deal_id, user_id, status, created_at, expires_at, deals!inner(title, business_id)',
      )
      .eq('deals.business_id', bizId)
      .order('created_at', { ascending: false });
    setVouchers((data as unknown as Voucher[]) ?? []);
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

      businessIdRef.current = business.id;
      await fetchVouchers(business.id);
      setLoading(false);
    }
    init();
  }, [fetchVouchers]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (businessIdRef.current) fetchVouchers(businessIdRef.current);
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchVouchers]);

  async function handleValidate(voucherId: string) {
    setValidating(voucherId);
    const supabase = createClient();
    await supabase.rpc('validate_voucher', { voucher_id: voucherId });
    if (businessIdRef.current) await fetchVouchers(businessIdRef.current);
    setValidating(null);
  }

  const filtered =
    filter === 'all' ? vouchers : vouchers.filter((v) => v.status === filter);

  const counts = {
    all: vouchers.length,
    active: vouchers.filter((v) => v.status === 'active').length,
    used: vouchers.filter((v) => v.status === 'used').length,
    expired: vouchers.filter((v) => v.status === 'expired').length,
  };

  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'active', label: `Active (${counts.active})` },
    { key: 'used', label: `Used (${counts.used})` },
    { key: 'expired', label: `Expired (${counts.expired})` },
  ];

  function statusBadge(status: string) {
    const styles: Record<string, string> = {
      active:
        'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20 ring-inset',
      used: 'bg-green-50 text-green-700 ring-1 ring-green-600/20 ring-inset',
      expired:
        'bg-slate-100 text-slate-500 ring-1 ring-slate-500/10 ring-inset',
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.expired}`}
      >
        {status}
      </span>
    );
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Vouchers
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track and validate customer vouchers. Refreshes automatically every 30
          seconds.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-[#2f7f65] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Voucher ID</th>
                <th className="px-6 py-3">Deal</th>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Expires</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-16 text-center text-slate-400"
                  >
                    No vouchers found.
                  </td>
                </tr>
              ) : (
                filtered.map((v, i) => (
                  <tr
                    key={v.id}
                    className={i % 2 === 1 ? 'bg-slate-50/50' : ''}
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                      {v.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {v.deals?.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-500">
                      {v.user_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">{statusBadge(v.status)}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-400">
                      {v.expires_at
                        ? new Date(v.expires_at).toLocaleDateString()
                        : '--'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {v.status === 'active' && (
                        <button
                          onClick={() => handleValidate(v.id)}
                          disabled={validating === v.id}
                          className="rounded-lg bg-[#2f7f65] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#266a54] disabled:opacity-50"
                        >
                          {validating === v.id ? 'Validating...' : 'Validate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
