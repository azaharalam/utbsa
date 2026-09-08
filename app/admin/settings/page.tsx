import { requireAdmin } from '@/lib/session';
import { getSettings } from '@/lib/queries/settings';
import SettingsForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  return <SettingsForm settings={settings} />;
}
