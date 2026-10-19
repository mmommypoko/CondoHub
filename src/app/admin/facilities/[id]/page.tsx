import 'server-only';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getActorFromSession } from '@/shared/auth/actor';
import { systemClock } from '@/shared/utils/clock';
import { Badge } from '@/shared/ui';
import { getFacilityDetail } from '@/modules/facility-booking/application/index';
import { getRoomDetail } from '@/modules/property-membership/application/index';
import {
  listBookingsForFacility,
  listSlotsForBooking,
} from '@/modules/facility-booking/infrastructure/facilityRepository';
import { db } from '@/shared/db/client';
import { FacilityEditForm } from '@/modules/facility-booking/ui/FacilityEditForm';
import { ClosureCreateForm } from '@/modules/facility-booking/ui/ClosureCreateForm';
import { ConfigChangeForm } from '@/modules/facility-booking/ui/ConfigChangeForm';
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

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function AdminFacilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await getActorFromSession();
  if (actor === null) redirect('/login?returnUrl=/admin/facilities');
  if (!actor.isSystemAdmin) redirect('/');
  if (actor.mustChangePassword) redirect('/change-password');
  const { id } = await params;
  const detail = await getFacilityDetail(actor, id, systemClock.now());
  if (detail === null) redirect('/admin/facilities');
  const bookings = await listBookingsForFacility(db, id);
  const bookingRows = [];
  const roomCodes = new Map<string, string>();
  for (const booking of bookings) {
    const slots = await listSlotsForBooking(db, booking.id);
    if (!roomCodes.has(booking.roomId)) {
      try {
        const room = await getRoomDetail(booking.roomId);
        roomCodes.set(booking.roomId, room.roomCode);
      } catch {
        roomCodes.set(booking.roomId, booking.roomId);
      }
    }
    bookingRows.push({ booking, slots });
  }
  const scheduleDays = detail.effectiveConfig?.schedule.days;
  const openDays =
    scheduleDays === undefined
      ? []
      : (Object.keys(scheduleDays) as Array<'0' | '1' | '2' | '3' | '4' | '5' | '6'>).filter(
          (day) => (scheduleDays[day]?.open.length ?? 0) > 0,
        );
  const firstOpen = openDays.length > 0 ? scheduleDays?.[openDays[0] as '0']?.open[0] : undefined;
  return (
    <main
      data-testid="admin-facility-detail-page"
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <Link
          data-testid="admin-facility-detail-back"
          href="/admin/facilities"
          className="inline-flex items-center gap-1.5 self-start rounded-md text-body font-medium text-link underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to facilities
        </Link>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h1
              data-testid="admin-facility-detail-title"
              className="break-words text-title font-semibold tracking-tight text-foreground"
            >
              {detail.name}
            </h1>
            <p className="text-small leading-small text-muted-foreground">
              Code {detail.code} · {detail.capacity} {detail.capacity === 1 ? 'seat' : 'seats'} per slot
            </p>
          </div>
          <Badge variant={detail.status === 'ACTIVE' ? 'success' : 'neutral'}>{detail.status}</Badge>
        </div>
        {detail.description !== null && detail.description !== '' ? (
          <p data-testid="admin-facility-detail-description" className="max-w-2xl break-words text-small leading-small text-muted-foreground">
            {detail.description}
          </p>
        ) : null}
      </div>
      <section aria-label="Facility settings" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-body font-semibold text-foreground">Settings</h2>
        <FacilityEditForm
          facilityId={detail.id}
          initial={{
            name: detail.name,
            description: detail.description,
            status: detail.status,
            capacity: detail.capacity,
          }}
        />
      </section>
      <section aria-label="Effective configuration" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-body font-semibold text-foreground">Effective configuration</h2>
        {detail.effectiveConfig === null ? (
          <p data-testid="admin-facility-no-config" className="text-small text-muted-foreground">
            No effective configuration.
          </p>
        ) : (
          <div
            data-testid="admin-facility-config"
            className="flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-surface p-4 text-body sm:p-5"
          >
            <p className="ui-tabular text-foreground">
              Version {detail.effectiveConfig.version} · {detail.effectiveConfig.slotMinutes} min slots ·
              quota {detail.effectiveConfig.quotaLimit}/{detail.effectiveConfig.quotaKind} · advance{' '}
              {detail.effectiveConfig.advanceDays} days
            </p>
            <p className="ui-tabular text-small text-muted-foreground">
              Effective {formatInstant(detail.effectiveConfig.effectiveAt)}
            </p>
            <p className="break-words text-small text-muted-foreground">
              Open:{' '}
              {openDays.length === 0
                ? 'none'
                : openDays.map((day) => WEEKDAY_LABELS[Number(day)]).join(', ')}
              {firstOpen !== undefined ? ` ${firstOpen.start}–${firstOpen.end}` : ''}
            </p>
            {detail.pendingConfig !== null ? (
              <p data-testid="admin-facility-pending" className="ui-tabular text-small text-muted-foreground">
                Pending version {detail.pendingConfig.version} from {formatInstant(detail.pendingConfig.effectiveAt)}
              </p>
            ) : null}
          </div>
        )}
      </section>
      <section aria-label="Change configuration" className="flex min-w-0 flex-col gap-3">
        <h2 className="text-body font-semibold text-foreground">Schedule a config change</h2>
        {detail.effectiveConfig === null ? (
          <p className="text-small text-muted-foreground">
            Commit a configuration before scheduling the next one.
          </p>
        ) : (
          <ConfigChangeForm
            facilityId={detail.id}
            capacity={detail.capacity}
            initial={{
              slotMinutes: detail.effectiveConfig.slotMinutes,
              quotaKind: detail.effectiveConfig.quotaKind,
              quotaLimit: detail.effectiveConfig.quotaLimit,
              advanceDays: detail.effectiveConfig.advanceDays,
              openStart: firstOpen?.start ?? '09:00',
              openEnd: firstOpen?.end ?? '18:00',
              openDays,
            }}
          />
        )}
      </section>
      <section aria-label="Closures" className="flex min-w-0 flex-col gap-3">
        <h2 className="ui-tabular text-body font-semibold text-foreground">Closures ({detail.closures.length})</h2>
        {detail.closures.length === 0 ? (
          <p data-testid="admin-facility-no-closures" className="text-small text-muted-foreground">
            No closures recorded.
          </p>
        ) : (
          <ul data-testid="admin-facility-closures" className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
            {detail.closures.map((closure) => (
              <li
                key={closure.id}
                className="flex min-w-0 flex-col gap-1 px-4 py-3 text-body sm:px-5"
              >
                <span className="ui-tabular break-words text-foreground">
                  {formatInstant(closure.startsAt)} – {formatInstant(closure.endsAt)}
                </span>
                <span className="break-words text-small text-muted-foreground">{closure.reason}</span>
              </li>
            ))}
          </ul>
        )}
        <ClosureCreateForm facilityId={detail.id} />
      </section>
      <section aria-label="Bookings" className="flex min-w-0 flex-col gap-3">
        <h2 className="ui-tabular text-body font-semibold text-foreground">Bookings ({bookingRows.length})</h2>
        {bookingRows.length === 0 ? (
          <p data-testid="admin-facility-no-bookings" className="text-small text-muted-foreground">
            No bookings recorded.
          </p>
        ) : (
          <ul data-testid="admin-facility-bookings" className="flex flex-col gap-3">
            {bookingRows.map(({ booking, slots }) => (
              <li
                key={booking.id}
                className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:p-5"
              >
                <p className="break-words text-small text-muted-foreground">
                  Room {roomCodes.get(booking.roomId) ?? booking.roomId} · booked {formatInstant(booking.createdAt.toISOString())}
                </p>
                <ul className="flex flex-col gap-2 border-t border-border pt-3">
                  {slots.map((slot) => (
                    <li
                      key={slot.id}
                      data-testid={`admin-facility-slot-${slot.id}`}
                      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <span className="ui-tabular min-w-0 break-words text-body text-foreground">
                          {formatInstant(slot.startsAt.toISOString())}
                        </span>
                        <Badge
                          variant={
                            slot.state === 'CONFIRMED'
                              ? 'success'
                              : slot.state === 'ADMIN_CANCELLED'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {slot.state}
                        </Badge>
                      </div>
                      {slot.state === 'CONFIRMED' ? (
                        <div className="flex flex-wrap gap-2">
                          <BookingCancelButton
                            bookingId={booking.id}
                            slotId={slot.id}
                            startsAt={slot.startsAt.toISOString()}
                            testId={`admin-facility-cancel-${slot.id}`}
                            admin
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
      </section>
    </main>
  );
}
