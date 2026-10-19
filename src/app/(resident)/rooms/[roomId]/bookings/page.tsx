import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, CalendarDays } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge, EmptyState } from '@/shared/ui';
import { canActInRoom } from '@/modules/property-membership/application/index';
import { findRoomById, findBuildingById } from '@/modules/property-membership/infrastructure/structureRepository';
import { db } from '@/shared/db/client';
import { getRoomQuota, listRoomBookings } from '@/modules/facility-booking/application/index';
import { listFacilityPage } from '@/modules/facility-booking/application/index';
import { BookingCancelButton } from '@/modules/facility-booking/ui/BookingCancelButton';

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

function slotVariant(state: string): 'success' | 'neutral' | 'danger' {
  if (state === 'CONFIRMED') return 'success';
  if (state === 'ADMIN_CANCELLED') return 'danger';
  return 'neutral';
}

export default async function RoomBookingsPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/rooms');
  if (actor.mustChangePassword) redirect('/change-password');
  if (actor.accountStatus !== 'ACTIVE') redirect('/login?returnUrl=/rooms');
  const { roomId } = await params;
  const now = systemClock.now();
  const verdict = await canActInRoom(actor.userId, roomId, 'BOOK_FACILITY', now).catch(() => null);
  if ((verdict === null || !verdict.allowed) && !actor.isSystemAdmin) {
    return (
      <main data-testid="room-bookings-page" className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <EmptyState
          data-testid="room-bookings-forbidden"
          icon={CalendarDays}
          title="Bookings not available"
          description="You do not have booking access to this room, or it does not exist."
        />
      </main>
    );
  }
  const room = await findRoomById(db, roomId);
  if (room === null) redirect('/rooms');
  const building = await findBuildingById(db, room.buildingId);
  const [bookings, facilities] = await Promise.all([
    listRoomBookings(actor, { roomId }, now),
    listFacilityPage(actor, { status: 'ACTIVE', page: 1, pageSize: 100 }),
  ]);
  const facilityNames = new Map(facilities.rows.map((row) => [row.id, row.name]));
  const quotas = [];
  for (const facility of facilities.rows) {
    try {
      quotas.push(await getRoomQuota(actor, facility.id, { roomId }, now));
    } catch {
      continue;
    }
  }
  return (
    <main
      data-testid="room-bookings-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Link
          data-testid="room-bookings-back"
          href={`/rooms/${roomId}`}
          className="inline-flex items-center gap-1.5 self-start rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to room
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 data-testid="room-bookings-title" className="break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Bookings · {building?.name ?? 'Building'} {room.roomCode}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Quota is shared by the whole room. Resident cancellations release the seat but keep quota used.
          </p>
        </div>
      </div>
      {quotas.length > 0 ? (
        <ul data-testid="room-bookings-quotas" className="flex flex-wrap gap-2">
          {quotas.map((quota) => (
            <li key={`${quota.facilityId}-${quota.periodKey}`}>
              <Badge
                data-testid={`room-bookings-quota-${quota.facilityId}`}
                variant={quota.quotaUsed >= quota.quotaLimit ? 'warning' : 'info'}
              >
                {facilityNames.get(quota.facilityId) ?? 'Facility'}: {quota.quotaUsed}/{quota.quotaLimit} {quota.quotaKind}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {bookings.length === 0 ? (
        <EmptyState
          data-testid="room-bookings-empty"
          icon={CalendarDays}
          title="No bookings yet"
          description="Book an open slot from the facilities page."
          action={
            <Link
              data-testid="room-bookings-browse"
              href="/facilities"
              className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Browse facilities
            </Link>
          }
        />
      ) : (
        <ul data-testid="room-bookings-list" className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <li
              key={booking.id}
              className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:p-5"
            >
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <Link
                  data-testid={`room-bookings-facility-${booking.id}`}
                  href={`/facilities/${booking.facilityId}?roomId=${roomId}`}
                  className="min-w-0 flex-1 basis-40 break-words rounded-lg text-sm font-semibold text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                >
                  {facilityNames.get(booking.facilityId) ?? 'Facility'}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">
                  Booked {formatInstant(booking.createdAt)}
                </span>
              </div>
              <ul className="flex flex-col gap-2 border-t border-border pt-3">
                {booking.slots.map((slot) => (
                  <li
                    key={slot.id}
                    data-testid={`room-bookings-slot-${slot.id}`}
                    className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                      <span className="min-w-0 break-words text-sm tabular-nums text-foreground">
                        {formatInstant(slot.startsAt)}
                      </span>
                      <Badge variant={slotVariant(slot.state)}>{slot.state}</Badge>
                    </div>
                    {slot.state === 'CONFIRMED' && new Date(slot.startsAt).getTime() > now.getTime() ? (
                      <div className="flex flex-wrap gap-2">
                        <BookingCancelButton
                          bookingId={booking.id}
                          slotId={slot.id}
                          startsAt={slot.startsAt}
                          testId={`room-bookings-cancel-${slot.id}`}
                        />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
