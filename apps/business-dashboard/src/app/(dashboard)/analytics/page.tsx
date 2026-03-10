'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

interface DayCount {
  date: string;
  label: string;
  count: number;
}

interface PopularDeal {
  title: string;
  count: number;
}

export default function AnalyticsPage() {
  const [dailyCounts, setDailyCounts] = useState<DayCount[]>([]);
  const [topDeals, setTopDeals] = useState<PopularDeal[]>([]);
  const [totalRedemptions, setTotalRedemptions] = useState(0);
  const [avgPoints, setAvgPoints] = useState(0);
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
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!business) {
        setLoading(false);
        return;
      }

      const { data: deals } = await supabase
        .from('deals')
        .select('id, title, points_cost')
        .eq('business_id', business.id);

      const dealIds = deals?.map((d) => d.id) ?? [];

      if (dealIds.length === 0) {
        buildEmptyChart();
        setLoading(false);
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: vouchers } = await supabase
        .from('vouchers')
        .select('id, status, deal_id, created_at')
        .in('deal_id', dealIds)
        .eq('status', 'used')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const used = vouchers ?? [];

      const countMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        countMap.set(d.toISOString().slice(0, 10), 0);
      }
      for (const v of used) {
        const key = v.created_at.slice(0, 10);
        if (countMap.has(key)) {
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
      }

      const daily: DayCount[] = Array.from(countMap.entries()).map(
        ([date, count]) => ({
          date,
          label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          count,
        }),
      );
      setDailyCounts(daily);

      const dealCountMap = new Map<string, number>();
      for (const v of used) {
        dealCountMap.set(v.deal_id, (dealCountMap.get(v.deal_id) ?? 0) + 1);
      }
      const dealTitleMap = new Map(deals?.map((d) => [d.id, d.title]) ?? []);
      const dealPointsMap = new Map(
        deals?.map((d) => [d.id, d.points_cost]) ?? [],
      );

      const sorted = Array.from(dealCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, count]) => ({
          title: dealTitleMap.get(id) ?? 'Unknown',
          count,
        }));
      setTopDeals(sorted);

      setTotalRedemptions(used.length);
      const totalPts = used.reduce(
        (sum, v) => sum + (dealPointsMap.get(v.deal_id) ?? 0),
        0,
      );
      setAvgPoints(used.length > 0 ? Math.round(totalPts / used.length) : 0);

      setLoading(false);
    }

    function buildEmptyChart() {
      const daily: DayCount[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        daily.push({
          date: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          count: 0,
        });
      }
      setDailyCounts(daily);
    }

    load();
  }, []);

  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1);

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
          Analytics
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Insights into your deal performance over the last 30 days.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        {[
          { label: 'Total Redemptions', value: totalRedemptions },
          { label: 'Avg Points / Redemption', value: avgPoints },
          { label: 'Top Deals Tracked', value: topDeals.length },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-base font-semibold text-slate-900">
          Redemptions (Last 30 Days)
        </h2>
        <div className="flex items-end gap-[3px] h-48">
          {dailyCounts.map((day) => (
            <div
              key={day.date}
              className="group relative flex flex-1 flex-col items-center"
            >
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {day.label}: {day.count}
              </div>
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${(day.count / maxCount) * 100}%`,
                  minHeight: day.count > 0 ? '4px' : '2px',
                  backgroundColor:
                    day.count > 0 ? '#2f7f65' : '#e2e8f0',
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>{dailyCounts[0]?.label}</span>
          <span>
            {dailyCounts[Math.floor(dailyCounts.length / 2)]?.label}
          </span>
          <span>{dailyCounts[dailyCounts.length - 1]?.label}</span>
        </div>
      </div>

      {/* Popular deals */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-900">
          Popular Deals
        </h2>
        {topDeals.length === 0 ? (
          <p className="text-sm text-slate-400">No redemptions yet.</p>
        ) : (
          <div className="space-y-3">
            {topDeals.map((deal, i) => {
              const pct =
                totalRedemptions > 0
                  ? Math.round((deal.count / totalRedemptions) * 100)
                  : 0;
              return (
                <div key={i}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2f7f65]/10 text-xs font-bold text-[#2f7f65]">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-900">
                        {deal.title}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-600">
                      {deal.count}
                    </span>
                  </div>
                  <div className="ml-9 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#2f7f65] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
