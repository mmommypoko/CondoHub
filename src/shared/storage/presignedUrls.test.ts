import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { captured, getSignedUrlMock } = vi.hoisted(() => {
  const captured: { input: Record<string, unknown> | null } = { input: null };
  const getSignedUrlMock = vi.fn(
    async (_client: unknown, command: { input: Record<string, unknown> }): Promise<string> => {
      captured.input = command.input;
      return 'https://uploads.test/put-object';
    },
  );
  return { captured, getSignedUrlMock };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: getSignedUrlMock }));

import { AppError } from '../utils/errors';
import { createUploadUrl } from './presignedUrls';
import { createS3Client } from './s3Client';

function testClient(): S3Client {
  return createS3Client({
    endpoint: 'http://localhost:4566',
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'test',
    secretAccessKey: 'test',
  });
}

describe('BUG-028 createUploadUrl ceiling handling', () => {
  beforeEach(() => {
    captured.input = null;
    getSignedUrlMock.mockClear();
  });

  it.each([2.5, 0, -1, Number.NaN])('fail-fast rejects invalid ceiling %s', async (ceiling) => {
    const error = await createUploadUrl('chat/a.png', 'image/png', ceiling, {
      client: testClient(),
      bucket: 'test-bucket',
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('VALIDATION_ERROR');
    expect((error as AppError).message).toBe('The expected upload size ceiling is invalid.');
    expect(getSignedUrlMock).not.toHaveBeenCalled();
  });

  it('signs Bucket, Key, and ContentType with no ContentLength in the command input', async () => {
    const result = await createUploadUrl('chat/a.png', 'image/png', 5_000_000, {
      client: testClient(),
      bucket: 'test-bucket',
    });
    expect(result.url).toBe('https://uploads.test/put-object');
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    expect(captured.input).toMatchObject({
      Bucket: 'test-bucket',
      Key: 'chat/a.png',
      ContentType: 'image/png',
    });
    expect(captured.input).not.toHaveProperty('ContentLength');
  });

  it('presigns with host-only SignedHeaders so real file sizes pass SigV4', async () => {
    await createUploadUrl('chat/a.png', 'image/png', 5_000_000, {
      client: testClient(),
      bucket: 'test-bucket',
    });
    const actual =
      await vi.importActual<typeof import('@aws-sdk/s3-request-presigner')>(
        '@aws-sdk/s3-request-presigner',
      );
    const url = await actual.getSignedUrl(
      testClient(),
      new PutObjectCommand({
        Bucket: captured.input?.Bucket as string,
        Key: captured.input?.Key as string,
        ContentType: captured.input?.ContentType as 'image/png',
      }),
      { expiresIn: 300 },
    );
    expect(new URL(url).searchParams.get('X-Amz-SignedHeaders')).toBe('host');
  });
});
