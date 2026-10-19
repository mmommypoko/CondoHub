import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { EmptyState } from '@/shared/ui';
import { getActiveResidentRooms } from '@/modules/property-membership/application/index';
import { findRoomById, findBuildingById } from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';
import { getFacilityDetail, listRoomBookings } from '@/modules/facility-booking/application/index';
import { SlotPicker } from '@/modules/facility-booking/ui/SlotPicker';

function formatInstant(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function quotaWindow(kind: string): string {
  if (kind === 'WEEKLY') return 'week';
  if (kind === 'MONTHLY') return 'month';
  return 'day';
}

export default async function ResidentFacilityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ roomId?: string; date?: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/facilities');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/facilities');
  const { id } = await params;
  const query = await searchParams;
  const now = systemClock.now();
  const detail = await getFacilityDetail(actor, id, now);
  if (detail === null || detail.status !== 'ACTIVE') {
    return (
      <main data-testid="facility-detail-page" className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <EmptyState
          data-testid="facility-detail-missing"
          icon={CalendarDays}
          title="Facility not available"
          description="This facility does not exist or is not open for booking."
          action={
            <Link
              data-testid="facility-detail-back"
              href="/facilities"
              className="inline-flex items-center gap-1.5 rounded-md text-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back to facilities
            </Link>
          }
        />
      </main>
    );
  }
  const jar = await cookies();
  const lastRoomId = jar.get('lastRoomId')?.value ?? null;
  const roomIds = actor.isSystemAdmin
    ? []
    : await getActiveResidentRooms(actor.userId, now);
  const rooms = [];
  for (const roomId of roomIds) {
    const room = await findRoomById(db, roomId);
    if (room === null) continue;
    const building = await findBuildingById(db, room.buildingId);
    rooms.push({ id: room.id, roomCode: room.roomCode, buildingCode: building?.code ?? 'Building' });
  }
  const initialRoomId =
    (query.roomId !== undefined && rooms.some((room) => room.id === query.roomId) ? query.roomId : null) ??
    (lastRoomId !== null && rooms.some((room) => room.id === lastRoomId) ? lastRoomId : null) ??
    rooms[0]?.id ??
    null;
  let upcoming: Array<{ id: string; startsAt: string }> = [];
  if (initialRoomId !== null) {
    try {
      const bookings = await listRoomBookings(actor, { roomId: initialRoomId }, now);
      upcoming = bookings
        .filter((booking) => booking.facilityId === detail.id)
        .flatMap((booking) =>
          booking.slots
            .filter((slot) => slot.state === 'CONFIRMED' && slot.startsAt > now.toISOString())
            .map((slot) => ({ id: slot.id, startsAt: slot.startsAt })),
        )
        .sort((a, b) => (a.startsAt < b.startsAt ? -1 : 1));
    } catch {
      upcoming = [];
    }
  }
  return (
    <main
      data-testid="facility-detail-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Link
          data-testid="facility-detail-back"
          href="/facilities"
          className="inline-flex items-center gap-1.5 self-start rounded-md text-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to facilities
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 data-testid="facility-detail-title" className="break-words text-title font-semibold tracking-tight text-foreground">
            {detail.name}
          </h1>
          {detail.description !== null && detail.description !== '' ? (
            <p data-testid="facility-detail-description" className="max-w-2xl break-words text-small leading-small text-muted-foreground">
              {detail.description}
            </p>
          ) : null}
          <p className="ui-tabular text-small text-muted-foreground">
            {detail.capacity} {detail.capacity === 1 ? 'seat' : 'seats'} per slot
            {detail.effectiveConfig !== null
              ? ` · ${detail.effectiveConfig.slotMinutes} min slots · up to ${detail.effectiveConfig.quotaLimit} bookings per ${quotaWindow(detail.effectiveConfig.quotaKind)}`
              : ''}
          </p>
        </div>
      </div>
      {rooms.length === 0 ? (
        <EmptyState
          data-testid="facility-detail-no-rooms"
          icon={CalendarDays}
          title="No entitled rooms"
          description="You need an active room membership before booking this facility."
        />
      ) : (
        <section aria-label="Book slots" className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <SlotPicker
            facilityId={detail.id}
            rooms={rooms}
            initialRoomId={initialRoomId}
            initialDate={query.date}
          />
        </section>
      )}
      {initialRoomId !== null && upcoming.length > 0 ? (
        <section aria-label="Your upcoming bookings" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-heading font-semibold tracking-tight text-foreground">Your upcoming bookings here</h2>
          <ul data-testid="facility-detail-bookings" className="flex min-w-0 flex-col gap-2">
            {upcoming.map((slot) => (
              <li key={slot.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3">
                <span className="ui-tabular min-w-0 break-words text-body text-foreground">
                  {formatInstant(slot.startsAt)}
                </span>
                <Link
                  data-testid="facility-detail-bookings-link"
                  href={`/rooms/${initialRoomId}/bookings`}
                  className="shrink-0 rounded-md text-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  View all bookings
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
