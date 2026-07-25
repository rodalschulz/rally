"use client";

import { useRef, useState, useTransition } from "react";
import type { Player } from "@/lib/domain/types";
import { addSinglesGameAction } from "@/lib/actions/sessions";
import { Spinner } from "@/components/Spinner";

export function SinglesGamesForm({
  playSessionId,
  players,
}: {
  playSessionId: string;
  players: Player[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [player1Id, setPlayer1Id] = useState(players[0]?.id ?? "");
  const [player2Id, setPlayer2Id] = useState(players[1]?.id ?? "");
  const [games1, setGames1] = useState("");
  const [games2, setGames2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (players.length < 2) {
    return (
      <p className="rounded-2xl bg-sand px-4 py-4 text-[0.9rem] text-muted">
        Para registrar un game hacen falta al menos{" "}
        <strong className="font-medium text-ink">2 asistentes</strong> con
        “Voy”.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      className="space-y-4 rounded-2xl bg-sand px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData();
        fd.set("playSessionId", playSessionId);
        fd.set("player1Id", player1Id);
        fd.set("player2Id", player2Id);
        fd.set("games1", games1);
        fd.set("games2", games2);
        startTransition(async () => {
          const result = await addSinglesGameAction(fd);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setGames1("");
          setGames2("");
        });
      }}
    >
      <div>
        <p className="text-[0.9rem] font-medium text-ink">Singles</p>
        <p className="mt-0.5 text-[0.8rem] text-muted">
          Elige dos asistentes y el marcador del game (ej. 6-4). El primero es
          Jugador 1.
        </p>
      </div>

      <label className="block text-[0.8rem] text-muted">
        Jugador 1
        <select
          value={player1Id}
          onChange={(e) => setPlayer1Id(e.target.value)}
          className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
          required
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-[0.8rem] text-muted">
        Jugador 2
        <select
          value={player2Id}
          onChange={(e) => setPlayer2Id(e.target.value)}
          className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
          required
        >
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>
      </label>

      <div>
        <p className="mb-1 text-[0.8rem] text-muted">Game</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={games1}
            onChange={(e) => setGames1(e.target.value)}
            placeholder="6"
            required
            aria-label="Games jugador 1"
            className="w-full rounded-xl bg-mist-2 px-3 py-2.5 text-center text-[1.1rem] font-semibold tabular-nums text-ink placeholder:font-normal placeholder:text-muted"
          />
          <span className="text-[1.1rem] font-medium text-muted" aria-hidden>
            –
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={99}
            value={games2}
            onChange={(e) => setGames2(e.target.value)}
            placeholder="4"
            required
            aria-label="Games jugador 2"
            className="w-full rounded-xl bg-mist-2 px-3 py-2.5 text-center text-[1.1rem] font-semibold tabular-nums text-ink placeholder:font-normal placeholder:text-muted"
          />
        </div>
        <p className="mt-1.5 text-[0.75rem] text-muted">
          Primer número = Jugador 1 · segundo = Jugador 2
        </p>
      </div>

      {error ? <p className="text-[0.9rem] text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ball py-3 text-[0.95rem] font-semibold text-on-ball disabled:opacity-60"
      >
        {pending ? (
          <>
            <Spinner />
            Guardando…
          </>
        ) : (
          "Aceptar game"
        )}
      </button>
    </form>
  );
}
