'use client';

import { useId, useState } from 'react';

import Image from 'next/image';

import { customInstance } from '@/api/mutator/custom-instance';
import { Button } from '@/components/ui/button';
import type { OriginalUpload } from '@/features/originals/types';

export function ImageUpload({
  label,
  kind,
  imageUrl,
  onUpload,
  onRemove,
  disabled = false,
  onPendingChange,
}: {
  label: string;
  kind: OriginalUpload['kind'];
  imageUrl?: string | null;
  onUpload: (image: OriginalUpload) => void;
  onRemove: () => void;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;

    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size < 1 ||
      file.size > 5242880
    ) {
      setError('JPG·PNG·WebP 이미지를 5MB 이하로 선택하세요.');

      return;
    }

    setError('');
    setPending(true);
    onPendingChange(true);

    try {
      const form = new FormData();

      form.set('file', file);
      form.set('kind', kind);

      const result = await customInstance<{ data: OriginalUpload }>(
        '/api/originals/images',
        { method: 'POST', body: form },
      );

      onUpload(result.data);
    } catch {
      setError('이미지를 불러올 수 없습니다. 다른 파일로 다시 시도하세요.');
    } finally {
      setPending(false);
      onPendingChange(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <p className="text-sm font-medium">{label}</p>
      {imageUrl ? (
        <Image
          unoptimized
          src={imageUrl}
          alt={`${label} 미리보기`}
          width={240}
          height={180}
          className="h-40 w-full rounded-sm bg-muted object-contain"
        />
      ) : (
        <p className="text-xs text-muted-foreground">이미지 없음</p>
      )}
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {imageUrl ? '이미지 교체' : '이미지 선택'} · JPG/PNG/WebP · 최대 5MB
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || pending}
        aria-label={`${label} ${imageUrl ? '교체' : '업로드'}`}
        className="block w-full text-sm file:mr-3 file:rounded-sm file:border file:bg-card file:px-3 file:py-2"
        onChange={(event) => {
          void upload(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {imageUrl ? (
        <Button
          variant="outline"
          disabled={disabled || pending}
          onClick={onRemove}
          type="button">
          {label} 제거
        </Button>
      ) : null}
      {pending ? (
        <p role="status" className="text-xs text-muted-foreground">
          이미지 처리 중…
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
