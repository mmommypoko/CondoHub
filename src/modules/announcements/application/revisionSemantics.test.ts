import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/db/client', () => ({
  db: { transaction: async (fn: (tx: object) => Promise<unknown>) => fn({}) },
  closeDb: async () => undefined,
}));
vi.mock('@/modules/media-attachments/application/index', () => ({
  commitAttachments: vi.fn(async () => undefined),
}));
vi.mock('@/modules/media-attachments/infrastructure/imageRepository', () => ({
  detachImages: vi.fn(async () => undefined),
  listAnnouncementImages: vi.fn(async () => [{ id: 'img-1' }]),
}));
vi.mock('@/shared/observability/audit', () => ({
  writeAudit: vi.fn(async () => undefined),
}));

const state: {
  title: string;
  body: string;
  publishAt: Date | null;
  hiddenAt: Date | null;
  revision: number;
  revisions: Array<{ version: number; snapshotJson: unknown; createdAt: Date }>;
} = {
  title: 'Lobby cleaning',
  body: 'Closed 9 to 11.',
  publishAt: new Date('2026-10-01T03:00:00.000Z'),
  hiddenAt: null as Date | null,
  revision: 1,
  revisions: [],
};

vi.mock('@/modules/announcements/infrastructure/announcementRepository', () => ({
  findAnnouncementById: vi.fn(async () => ({
    id: 'a0000000-0000-4000-8000-000000000001',
    authorId: 'admin-1',
    title: state.title,
    body: state.body,
    publishAt: state.publishAt,
    hiddenAt: state.hiddenAt,
    editedAt: null,
    revision: state.revision,
  })),
  findAnnouncementByIdForUpdate: vi.fn(async () => ({
    id: 'a0000000-0000-4000-8000-000000000001',
    authorId: 'admin-1',
    title: state.title,
    body: state.body,
    publishAt: state.publishAt,
    hiddenAt: state.hiddenAt,
    editedAt: null,
    revision: state.revision,
  })),
  insertAnnouncement: vi.fn(async () => ({
    id: 'a0000000-0000-4000-8000-000000000002',
    authorId: 'admin-1',
    title: state.title,
    body: state.body,
    publishAt: state.publishAt,
    hiddenAt: null,
    editedAt: null,
    revision: 1,
  })),
  insertAnnouncementRevision: vi.fn(
    async (_tx: unknown, input: { version: number; snapshotJson: unknown }) => {
      state.revisions.push({
        version: input.version,
        snapshotJson: input.snapshotJson,
        createdAt: new Date(),
      });
      return { id: 'rev', createdAt: new Date() };
    },
  ),
  updateAnnouncement: vi.fn(
    async (
      _tx: unknown,
      _id: string,
      input: { title?: string; body?: string; publishAt?: Date | null; hiddenAt?: Date | null; revision?: number },
    ) => {
      if (input.title !== undefined) state.title = input.title;
      if (input.body !== undefined) state.body = input.body;
      if (input.publishAt !== undefined) state.publishAt = input.publishAt;
      if (input.hiddenAt !== undefined) state.hiddenAt = input.hiddenAt;
      if (input.revision !== undefined) state.revision = input.revision;
      return {
        id: 'a0000000-0000-4000-8000-000000000001',
        authorId: 'admin-1',
        title: state.title,
        body: state.body,
        publishAt: state.publishAt,
        hiddenAt: state.hiddenAt,
        editedAt: new Date(),
        revision: state.revision,
      };
    },
  ),
  listAnnouncementRevisions: vi.fn(async () => state.revisions),
  listAllAnnouncements: vi.fn(async () => []),
  markAnnouncementDeleted: vi.fn(async () => undefined),
}));

import type { Actor } from '@/shared/auth/actor';
import { createAnnouncement, updateAnnouncementEntry } from './announcements';

const admin: Actor = {
  userId: 'admin-1',
  isSystemAdmin: true,
  accountStatus: 'ACTIVE',
  mustChangePassword: false,
};

const ctx = {
  clock: { now: () => new Date('2026-10-20T12:00:00.000Z') },
  requestId: 'req-1',
  isSeedActor: false,
};

const ID = 'a0000000-0000-4000-8000-000000000001';

function resetState(publishAt: Date | null = new Date('2026-10-01T03:00:00.000Z')): void {
  state.title = 'Lobby cleaning';
  state.body = 'Closed 9 to 11.';
  state.publishAt = publishAt;
  state.hiddenAt = null;
  state.revision = 1;
  state.revisions = [];
}

describe('BUG-022 visibility-only changes create no revision', () => {
  beforeEach(() => {
    resetState();
  });

  it('hiding a published announcement leaves revision and history untouched', async () => {
    const out = await updateAnnouncementEntry(
      admin,
      ID,
      { hiddenAt: '2026-10-20T12:00:00.000Z' },
      ctx,
    );
    expect(out.status).toBe('HIDDEN');
    expect(out.revision).toBe(1);
    expect(out.editedAt).toBeNull();
    expect(state.revisions).toHaveLength(0);
  });

  it('restoring a hidden announcement leaves revision and history untouched', async () => {
    state.hiddenAt = new Date('2026-10-19T12:00:00.000Z');
    const out = await updateAnnouncementEntry(admin, ID, { hiddenAt: null }, ctx);
    expect(out.status).toBe('PUBLISHED');
    expect(out.revision).toBe(1);
    expect(state.revisions).toHaveLength(0);
  });
});

describe('BUG-024 revisions store the pre-edit image with an initial snapshot', () => {
  beforeEach(() => {
    resetState();
  });

  it('creates an initial revision snapshot when the announcement is created', async () => {
    await createAnnouncement(
      admin,
      { title: 'Lobby cleaning', body: 'Closed 9 to 11.', publishAt: null, imageIds: [] },
      ctx,
    );
    expect(state.revisions).toHaveLength(1);
    expect(state.revisions[0]?.version).toBe(1);
    expect(state.revisions[0]?.snapshotJson).toMatchObject({
      title: 'Lobby cleaning',
      body: 'Closed 9 to 11.',
      revision: 1,
    });
  });

  it('stores the pre-edit content when published content changes', async () => {
    const out = await updateAnnouncementEntry(admin, ID, { body: 'Closed 9 to 12.' }, ctx);
    expect(out.revision).toBe(2);
    expect(state.revisions).toHaveLength(1);
    expect(state.revisions[0]?.version).toBe(2);
    expect(state.revisions[0]?.snapshotJson).toMatchObject({
      title: 'Lobby cleaning',
      body: 'Closed 9 to 11.',
      imageIds: ['img-1'],
      revision: 1,
    });
  });

  it('creates no revision when a draft is edited before first publish', async () => {
    resetState(null);
    const out = await updateAnnouncementEntry(admin, ID, { body: 'Draft edit.' }, ctx);
    expect(out.revision).toBe(1);
    expect(state.revisions).toHaveLength(0);
  });
});
