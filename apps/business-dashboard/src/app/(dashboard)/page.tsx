'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface Stats {
  activeDeals: number;
  totalRedemptions: number;
  pointsSpent: number;
  activeVouchers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    activeDeals: 0,
    totalRedemptions: 0,
    pointsSpent: 0,
    activeVouchers: 0,
  });
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);

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
        .select('id, name')
        .eq('owner_id', user.id)
        .single();

      if (!business) {
        setLoading(false);
        return;
      }

      setBusinessName(business.name);

      const { data: deals } = await supabase
        .from('deals')
        .select('id, is_active, points_cost')
        .eq('business_id', business.id);

      const activeDealCount = deals?.filter((d) => d.is_active).length ?? 0;
      const dealIds = deals?.map((d) => d.id) ?? [];

      let totalRedemptions = 0;
      let activeVouchers = 0;
      let pointsSpent = 0;

      if (dealIds.length > 0) {
        const { data: vouchers } = await supabase
          .from('vouchers')
          .select('id, status, deal_id')
          .in('deal_id', dealIds);

        const dealCostMap = new Map(
          deals?.map((d) => [d.id, d.points_cost]) ?? [],
        );
        totalRedemptions =
          vouchers?.filter((v) => v.status === 'used').length ?? 0;
        activeVouchers =
          vouchers?.filter((v) => v.status === 'active').length ?? 0;
        pointsSpent =
          vouchers
            ?.filter((v) => v.status === 'used')
            .reduce(
              (sum, v) => sum + (dealCostMap.get(v.deal_id) ?? 0),
              0,
            ) ?? 0;
      }

      setStats({
        activeDeals: activeDealCount,
        totalRedemptions,
        pointsSpent,
        activeVouchers,
      });
      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  const cards = [
    {
      label: 'Active Deals',
      value: stats.activeDeals,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
        </svg>
      ),
    },
    {
      label: 'Total Redemptions',
      value: stats.totalRedemptions,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'Points Spent',
      value: stats.pointsSpent.toLocaleString(),
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      ),
    },
    {
      label: 'Active Vouchers',
      value: stats.activeVouchers,
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {businessName ? `Welcome back, ${businessName}` : 'Dashboard'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here is an overview of your business performance.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {card.label}
              </span>
              <span className="text-primary-500">{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
