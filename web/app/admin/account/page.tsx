import type { Metadata } from 'next';
import { AccountPage } from '@/components/admin/AccountPage';

export const metadata: Metadata = { title: 'Account' };

export default function AdminAccountPage() {
  return <AccountPage />;
}
