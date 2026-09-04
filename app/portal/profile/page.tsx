import { requireApproved } from '@/lib/session';
import ProfileForm from './form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My profile' };

export default async function ProfilePage() {
  const me = await requireApproved();
  return <ProfileForm member={me} />;
}
