import 'server-only';
import type { Clock } from '@/shared/utils/clock';
import { systemClock } from '@/shared/utils/clock';

export interface AnnouncementCtx {
  clock: Clock;
  requestId: string;
  isSeedActor: boolean;
}

export function createAnnouncementCtx(input: {
  requestId: string;
  isSeedActor?: boolean;
}): AnnouncementCtx {
  return {
    clock: systemClock,
    requestId: input.requestId,
    isSeedActor: input.isSeedActor ?? false,
  };
}
