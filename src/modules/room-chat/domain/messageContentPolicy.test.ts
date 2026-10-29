import { describe, expect, it } from 'vitest';
import { AppError } from '@/shared/utils/errors';
import { assertMessageContentValid, CHAT_TEXT_MAX_LENGTH } from './messageSend';

describe('BUG-030 message content policy: OR with image-wins type derivation', () => {
  it('accepts text plus image and derives type IMAGE', () => {
    const validated = assertMessageContentValid({
      text: 'Lobby photo from tenant A.',
      imageId: '01934f3a-aaaa-7d4e-8f90-abcdef123456',
    });
    expect(validated).toEqual({
      text: 'Lobby photo from tenant A.',
      imageId: '01934f3a-aaaa-7d4e-8f90-abcdef123456',
      type: 'IMAGE',
    });
  });

  it('accepts image-only content as an IMAGE message', () => {
    const validated = assertMessageContentValid({
      text: null,
      imageId: '01934f3a-aaaa-7d4e-8f90-abcdef123456',
    });
    expect(validated.type).toBe('IMAGE');
    expect(validated.imageId).toBe('01934f3a-aaaa-7d4e-8f90-abcdef123456');
  });

  it('accepts text-only content as a TEXT message', () => {
    const validated = assertMessageContentValid({ text: 'Lobby lights are out.', imageId: null });
    expect(validated.type).toBe('TEXT');
    expect(validated.text).toBe('Lobby lights are out.');
  });

  it('rejects empty content with VALIDATION_ERROR', () => {
    for (const text of [null, '', '   ']) {
      try {
        assertMessageContentValid({ text, imageId: null });
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe('VALIDATION_ERROR');
      }
    }
  });

  it('rejects text beyond the maximum length with VALIDATION_ERROR', () => {
    try {
      assertMessageContentValid({ text: 'x'.repeat(CHAT_TEXT_MAX_LENGTH + 1), imageId: null });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('accepts text at exactly the maximum length', () => {
    const validated = assertMessageContentValid({
      text: 'y'.repeat(CHAT_TEXT_MAX_LENGTH),
      imageId: null,
    });
    expect(validated.type).toBe('TEXT');
  });
});
