import { requirePermission } from '@/lib/session';
import { getSettings } from '@/lib/queries/settings';
import SettingsForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requirePermission('roles');
  const settings = await getSettings();
  return <SettingsForm settings={settings} />;
}
