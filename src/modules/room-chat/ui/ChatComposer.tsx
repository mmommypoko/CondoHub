'use client';

import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, SendHorizontal, X } from 'lucide-react';
import { Button, FormField, TEXTAREA_CLASS, cx } from '@/shared/ui';
import {
  CHAT_COMPOSER_TEXT_MAX,
  chatComposerFormSchema,
  type ChatComposerFormValues,
} from '@/modules/room-chat/ui/chatFormSchemas';

interface IntentEnvelope {
  data: { imageId: string; uploadUrl: string; expiresAt: string };
}

interface CompleteEnvelope {
  data: { imageId: string; byteSize: number; mimeVerified: string };
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

function putBytes(url: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed with status ${xhr.status}.`));
    };
    xhr.onerror = () => reject(new Error('Upload failed.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(file);
  });
}

export interface ChatComposerAttachment {
  imageId: string;
  fileName: string;
}

export function ChatComposer({
  onSend,
  sending,
  testIdPrefix,
}: {
  onSend: (input: { text: string; attachment: ChatComposerAttachment | null }) => void;
  sending: boolean;
  testIdPrefix: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [attachment, setAttachment] = useState<ChatComposerAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setFocus,
    reset,
    formState: { errors },
  } = useForm<ChatComposerFormValues>({
    resolver: zodResolver(chatComposerFormSchema),
    defaultValues: { text: '' },
  });

  async function uploadFile(file: File): Promise<void> {
    if (!ACCEPTED.includes(file.type)) {
      setUploadError('Unsupported file type. Supported types: JPEG, PNG, WebP.');
      return;
    }
    if (attachment !== null) {
      setUploadError('Only 1 image per message. Remove the current image first.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const intentResponse = await fetch('/api/images/intents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'CHAT',
          entityRef: { type: 'chat_message', id: null },
          contentType: file.type,
          fileName: file.name.slice(0, 255),
        }),
      });
      if (!intentResponse.ok) {
        const payload = (await intentResponse.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(payload?.error.message ?? 'Could not start the upload.');
      }
      const intent = (await intentResponse.json()) as IntentEnvelope;
      await putBytes(intent.data.uploadUrl, file);
      const completeResponse = await fetch(`/api/images/${intent.data.imageId}/complete`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      if (!completeResponse.ok) {
        const payload = (await completeResponse.json().catch(() => null)) as ErrorEnvelope | null;
        throw new Error(payload?.error.message ?? 'The image could not be verified.');
      }
      const completed = (await completeResponse.json()) as CompleteEnvelope;
      setAttachment({ imageId: completed.data.imageId, fileName: file.name });
    } catch (uploadFailure) {
      setUploadError(uploadFailure instanceof Error ? uploadFailure.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current !== null) inputRef.current.value = '';
    }
  }

  const onSubmit = handleSubmit(
    (values) => {
      const text = values.text.trim();
      if (text === '' && attachment === null) {
        setFocus('text');
        return;
      }
      onSend({ text, attachment });
      reset();
      setAttachment(null);
      setUploadError(null);
    },
    () => setFocus('text'),
  );

  return (
    <form
      data-testid={`${testIdPrefix}-composer`}
      onSubmit={onSubmit}
      noValidate
      className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-border bg-surface p-3 shadow-raised sm:p-4"
    >
      <FormField
        label="Message"
        htmlFor={`${testIdPrefix}-composer-text`}
        {...(errors.text?.message === undefined ? {} : { error: errors.text.message })}
        errorTestId={`${testIdPrefix}-composer-text-error`}
      >
        <textarea
          data-testid={`${testIdPrefix}-composer-text`}
          rows={3}
          maxLength={CHAT_COMPOSER_TEXT_MAX}
          placeholder="Write a message to the room."
          className={cx(TEXTAREA_CLASS, 'resize-y leading-6')}
          {...register('text')}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void onSubmit();
          }}
        />
      </FormField>
      <input
        ref={inputRef}
        data-testid={`${testIdPrefix}-composer-upload-input`}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Choose an image to attach"
        disabled={uploading || sending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void uploadFile(file);
        }}
      />
      {attachment !== null ? (
        <div data-testid={`${testIdPrefix}-composer-attachment`} className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-neutral px-3 py-2 text-sm">
          <span className="min-w-0 truncate text-foreground">{attachment.fileName}</span>
          <Button
            data-testid={`${testIdPrefix}-composer-attachment-remove`}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Remove ${attachment.fileName}`}
            onClick={() => setAttachment(null)}
          >
            <X aria-hidden="true" className="size-4" />
            Remove
          </Button>
        </div>
      ) : null}
      {uploading ? (
        <p data-testid={`${testIdPrefix}-composer-upload-progress`} role="status" className="text-small leading-small text-muted-foreground">
          Uploading the image.
        </p>
      ) : null}
      {uploadError !== null ? (
        <p data-testid={`${testIdPrefix}-composer-upload-error`} role="alert" className="text-body leading-body font-medium text-danger-foreground">
          {uploadError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          data-testid={`${testIdPrefix}-composer-attach`}
          type="button"
          variant="secondary"
          size="sm"
          loading={uploading}
          disabled={attachment !== null || sending}
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus aria-hidden="true" className="size-4" />
          Attach image
        </Button>
        <Button data-testid={`${testIdPrefix}-composer-send`} type="submit" loading={sending} size="sm">
          <SendHorizontal aria-hidden="true" className="size-4" />
          Send
        </Button>
        <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">JPEG, PNG, or WebP. Up to 5 MB, 1 image per message.</p>
      </div>
    </form>
  );
}
