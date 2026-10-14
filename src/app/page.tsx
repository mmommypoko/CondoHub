import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { getActiveResidentRooms } from '@/modules/property-membership/application/index';

export default async function HomePage() {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/');
  if (actor.isSystemAdmin) redirect('/admin/buildings');
  const jar = await cookies();
  const lastRoomId = jar.get('lastRoomId')?.value ?? null;
  const roomIds = await getActiveResidentRooms(actor.userId, systemClock.now());
  if (lastRoomId !== null && roomIds.includes(lastRoomId)) redirect(`/rooms/${lastRoomId}`);
  if (roomIds.length > 0) redirect(`/rooms/${roomIds[0]}`);
  redirect('/rooms');
}
