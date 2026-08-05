"use client";

import { useRef, useState, useTransition } from "react";
import {
  removeAvatarAction,
  uploadAvatarAction,
} from "@/lib/actions/profile";
import { prepareStickerFile } from "@/lib/avatar/prepareSticker";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Spinner } from "@/components/Spinner";
import type { Player } from "@/lib/domain/types";

type Props = {
  player: Player;
};

export function AvatarStickerPicker({ player }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState(player.avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewPlayer: Player = {
    ...player,
    avatarUrl: previewUrl,
  };

  function onPick(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setError(null);
    startTransition(async () => {
      try {
        const prepared = await prepareStickerFile(file);
        const formData = new FormData();
        formData.set("file", prepared);
        const result = await uploadAvatarAction(formData);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setPreviewUrl(result.avatarUrl);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo subir el sticker.",
        );
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  function onRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeAvatarAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreviewUrl(null);
    });
  }

  return (
    <section className="animate-rise space-y-3 rounded-2xl bg-sand px-3 py-3 ring-1 ring-ink/8">
      <div className="flex items-center gap-3">
        <PlayerAvatar player={previewPlayer} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.95rem] font-medium text-ink">Sticker avatar</p>
          <p className="text-[0.8rem] text-muted">
            PNG o WebP, ideal con fondo transparente. Máx. 300 KB.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/webp"
        className="sr-only"
        onChange={(e) => onPick(e.target.files)}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ball px-3 py-2.5 text-[0.9rem] font-semibold text-on-ball disabled:opacity-60"
        >
          {pending ? <Spinner /> : null}
          {previewUrl ? "Cambiar sticker" : "Subir sticker"}
        </button>
        {previewUrl ? (
          <button
            type="button"
            disabled={pending}
            onClick={onRemove}
            className="rounded-xl bg-ink/5 px-3 py-2.5 text-[0.9rem] font-medium text-muted ring-1 ring-ink/10 disabled:opacity-60"
          >
            Quitar
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-[0.8rem] text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
