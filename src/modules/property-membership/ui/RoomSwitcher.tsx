'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { INPUT_BASE_CLASS, cx } from '@/shared/ui';

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
        className={cx(INPUT_BASE_CLASS, 'h-9 max-w-40 px-2 font-medium sm:max-w-56')}
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
