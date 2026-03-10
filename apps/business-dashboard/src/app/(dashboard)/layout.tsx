import { createServerSupabaseClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DashboardShell } from './dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const businessName =
    (user.user_metadata?.business_name as string) ?? 'My Business';

  return (
    <DashboardShell businessName={businessName}>
      {children}
    </DashboardShell>
  );
}
