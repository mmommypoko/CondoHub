'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Badge } from '@/shared/ui/Badge';
import { EmptyState } from '@/shared/ui/EmptyState';
import { useToast } from '@/shared/ui/Toast';

interface SlotRow {
  startsAt: string;
  endsAt: string;
  confirmed: number;
  capacity: number;
  remaining: number;
  mine: number;
  available: boolean;
}

interface AvailabilityPayload {
  data: {
    facilityId: string;
    date: string;
    roomId: string;
    quotaKind: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    quotaLimit: number;
    quotaUsed: number;
    periodKey: string;
    slots: SlotRow[];
  };
}

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('en-US', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function todayProjectDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function SlotPicker({
  facilityId,
  rooms,
  initialRoomId,
  initialDate,
}: {
  facilityId: string;
  rooms: Array<{ id: string; roomCode: string; buildingCode: string }>;
  initialRoomId: string | null;
  initialDate?: string | undefined;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState(initialRoomId ?? rooms[0]?.id ?? '');
  const [date, setDate] = useState(initialDate ?? todayProjectDate());
  const [payload, setPayload] = useState<AvailabilityPayload['data'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (roomId === '') return;
    setLoading(true);
    setLoadError(null);
    setSelected([]);
    try {
      const response = await fetch(
        `/api/facilities/${facilityId}/slots?date=${encodeURIComponent(date)}&roomId=${encodeURIComponent(roomId)}`,
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ErrorPayload | null;
        setLoadError(body?.error?.message ?? 'Could not load availability.');
        setPayload(null);
        return;
      }
      const body = (await response.json()) as AvailabilityPayload;
      setPayload(body.data);
    } catch {
      setLoadError('Could not load availability.');
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, roomId, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback((startsAt: string, available: boolean) => {
    if (!available) return;
    setSelected((current) =>
      current.includes(startsAt)
        ? current.filter((item) => item !== startsAt)
        : [...current, startsAt].sort(),
    );
  }, []);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const submit = useCallback(async () => {
    if (selected.length === 0 || roomId === '') return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const key =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-booking`;
      const response = await fetch(`/api/facilities/${facilityId}/bookings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ roomId, startsAt: selected }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ErrorPayload | null;
        setSubmitError(body?.error?.message ?? 'Could not confirm the booking.');
        return;
      }
      toast.success('Booking confirmed.');
      router.push(`/rooms/${roomId}/bookings`);
      router.refresh();
    } catch {
      setSubmitError('Could not confirm the booking.');
    } finally {
      setSubmitting(false);
    }
  }, [facilityId, roomId, selected, router, toast]);

  return (
    <div className="flex flex-col gap-4" data-testid="slot-picker">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Room</span>
          <select
            data-testid="slot-picker-room"
            aria-label="Room"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.buildingCode} · {room.roomCode}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Date</span>
          <input
            data-testid="slot-picker-date"
            type="date"
            aria-label="Date"
            className="h-10 w-full min-w-0 rounded-lg border border-input-border bg-surface px-3 text-sm text-foreground"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>
      {payload !== null ? (
        <div className="flex flex-wrap items-center gap-2" data-testid="slot-picker-quota">
          <Badge variant="info">
            Quota {payload.quotaUsed}/{payload.quotaLimit} {payload.quotaKind}
          </Badge>
          <span className="text-xs text-muted-foreground">Period {payload.periodKey}</span>
        </div>
      ) : null}
      {loadError !== null ? (
        <p data-testid="slot-picker-load-error" role="alert" className="text-sm text-danger">
          {loadError}
        </p>
      ) : null}
      {loading ? (
        <p data-testid="slot-picker-loading" className="text-sm text-muted-foreground">
          Loading slots…
        </p>
      ) : null}
      {!loading && payload !== null && payload.slots.length === 0 ? (
        <EmptyState
          data-testid="slot-picker-empty"
          icon={CalendarDays}
          title="No slots on this date"
          description="The facility is closed, fully past, or covered by a closure on this date."
        />
      ) : null}
      {!loading && payload !== null && payload.slots.length > 0 ? (
        <div
          data-testid="slot-picker-grid"
          role="group"
          aria-label="Available slots"
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {payload.slots.map((slot) => {
            const active = selectedSet.has(slot.startsAt);
            const slug = slot.startsAt
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '');
            return (
              <button
                key={slot.startsAt}
                type="button"
                data-testid={`slot-picker-slot-${slug}`}
                aria-pressed={active}
                disabled={!slot.available}
                onClick={() => toggle(slot.startsAt, slot.available)}
                className={`flex min-w-0 flex-col gap-1 rounded-xl border p-3 text-left text-sm transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-foreground'
                    : slot.available
                      ? 'border-border bg-surface text-foreground hover:border-primary'
                      : 'cursor-not-allowed border-border bg-neutral text-muted-foreground'
                }`}
              >
                <span className="font-semibold">
                  {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
                </span>
                <span className="text-xs">
                  {slot.available
                    ? `${slot.remaining} of ${slot.capacity} seats left`
                    : slot.startsAt <= new Date().toISOString()
                      ? 'Already started'
                      : 'Full'}
                  {slot.mine > 0 ? ` · ${slot.mine} mine` : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {submitError !== null ? (
        <p data-testid="slot-picker-submit-error" role="alert" className="text-sm text-danger">
          {submitError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          data-testid="slot-picker-submit"
          loading={submitting}
          disabled={selected.length === 0 || loading}
          onClick={() => void submit()}
          fullWidthOnMobile
        >
          {selected.length === 0 ? 'Select slots' : `Confirm ${selected.length} slot${selected.length === 1 ? '' : 's'}`}
        </Button>
        {selected.length > 0 ? (
          <Button type="button" variant="secondary" onClick={() => setSelected([])}>
            Clear
          </Button>
        ) : null}
      </div>
    </div>
  );
}
