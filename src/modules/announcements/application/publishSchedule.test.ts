import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));

import { announcementCreateBody, announcementPatchBody } from './routeSchemas';

const PAST = new Date(Date.now() - 60_000).toISOString();
const FUTURE = new Date(Date.now() + 3_600_000).toISOString();

describe('BUG-021 scheduled publish intent requires a future time', () => {
  it('rejects a scheduled create whose publishAt is in the past', () => {
    const parsed = announcementCreateBody.safeParse({
      title: 'Lobby cleaning',
      body: 'Closed 9 to 11.',
      publishMode: 'scheduled',
      publishAt: PAST,
      imageIds: [],
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.join('.') === 'publishAt')).toBe(true);
    }
  });

  it('rejects a scheduled create whose publishAt is missing or invalid', () => {
    for (const publishAt of [null, 'not-a-date']) {
      const parsed = announcementCreateBody.safeParse({
        title: 'Lobby cleaning',
        body: 'Closed 9 to 11.',
        publishMode: 'scheduled',
        publishAt,
        imageIds: [],
      });
      expect(parsed.success).toBe(false);
    }
  });

  it('accepts a scheduled create with a future time', () => {
    expect(
      announcementCreateBody.safeParse({
        title: 'Lobby cleaning',
        body: 'Closed 9 to 11.',
        publishMode: 'scheduled',
        publishAt: FUTURE,
        imageIds: [],
      }).success,
    ).toBe(true);
  });

  it('accepts draft and immediate modes without a future time', () => {
    for (const mode of ['draft', 'now'] as const) {
      expect(
        announcementCreateBody.safeParse({
          title: 'Lobby cleaning',
          body: 'Closed 9 to 11.',
          publishMode: mode,
          publishAt: mode === 'draft' ? null : new Date().toISOString(),
          imageIds: [],
        }).success,
      ).toBe(true);
    }
  });

  it('keeps undeclared intent open so immediate-publish flows still work', () => {
    expect(
      announcementCreateBody.safeParse({
        title: 'Lobby cleaning',
        body: 'Closed 9 to 11.',
        publishAt: PAST,
        imageIds: [],
      }).success,
    ).toBe(true);
  });

  it('applies the same scheduled rule on patch', () => {
    expect(
      announcementPatchBody.safeParse({ publishMode: 'scheduled', publishAt: PAST }).success,
    ).toBe(false);
    expect(
      announcementPatchBody.safeParse({ publishMode: 'scheduled', publishAt: FUTURE }).success,
    ).toBe(true);
    expect(announcementPatchBody.safeParse({ publishAt: PAST }).success).toBe(true);
  });
});
