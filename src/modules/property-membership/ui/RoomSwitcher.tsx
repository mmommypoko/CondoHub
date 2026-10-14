'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';

export interface RoomSwitcherRoom {
  id: string;
  roomCode: string;
  buildingCode: string;
}

export function RoomSwitcher({
  rooms,
  currentRoomId,
}: {
  rooms: RoomSwitcherRoom[];
  currentRoomId: string | null;
}) {
  const router = useRouter();
  if (rooms.length === 0) return null;
  return (
    <label className="flex min-w-0 items-center gap-2 text-sm">
      <Building2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="sr-only">Current room</span>
      <select
        data-testid="room-switcher"
        aria-label="Current room"
        className="h-9 w-full min-w-0 max-w-36 rounded-lg border border-input-border bg-surface px-2 text-sm text-foreground sm:max-w-56"
        value={currentRoomId ?? ''}
        onChange={(event) => {
          const next = event.target.value;
          if (next !== '') {
            document.cookie = `lastRoomId=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
            router.push(`/rooms/${next}`);
          }
        }}
      >
        {currentRoomId === null ? <option value="">Select a room</option> : null}
        {rooms.map((room) => (
          <option key={room.id} value={room.id}>
            {room.buildingCode} · {room.roomCode}
          </option>
        ))}
      </select>
    </label>
  );
}
