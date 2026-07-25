"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Match, Player } from "@/lib/domain/types";
import {
  addSinglesGameAction,
  deleteSinglesGameAction,
  updateSinglesGameAction,
} from "@/lib/actions/sessions";
import { Spinner } from "@/components/Spinner";

type Draft = {
  player1Id: string;
  player2Id: string;
  games1: string;
  games2: string;
};

function emptyDraft(players: Player[]): Draft {
  return {
    player1Id: players[0]?.id ?? "",
    player2Id: players[1]?.id ?? "",
    games1: "",
    games2: "",
  };
}

function draftFromMatch(m: Match): Draft {
  const [g1 = "", g2 = ""] = m.score.split("-");
  return {
    player1Id: m.sideA[0] ?? "",
    player2Id: m.sideB[0] ?? "",
    games1: g1,
    games2: g2,
  };
}

export function SinglesGamesPanel({
  playSessionId,
  players,
  labelPlayers,
  games,
  canManage,
}: {
  playSessionId: string;
  /** Asistentes Voy — opciones del form */
  players: Player[];
  /** Para mostrar nombres en la lista (todos los miembros) */
  labelPlayers: Player[];
  games: Match[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(players));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!editingId) {
      setDraft(emptyDraft(players));
    }
  }, [players, editingId]);

  const startEdit = (m: Match) => {
    setEditingId(m.id);
    setDraft(draftFromMatch(m));
    setError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(emptyDraft(players));
    setError(null);
  };

  const submit = () => {
    setError(null);
    if (!draft.player1Id || !draft.player2Id) {
      setError("Hacen falta dos jugadores distintos para registrar el game");
      return;
    }
    if (draft.player1Id === draft.player2Id) {
      setError("Los jugadores tienen que ser distintos");
      return;
    }

    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("player1Id", draft.player1Id);
    fd.set("player2Id", draft.player2Id);
    fd.set("games1", draft.games1);
    fd.set("games2", draft.games2);
    if (editingId) fd.set("matchId", editingId);

    startTransition(async () => {
      const result = editingId
        ? await updateSinglesGameAction(fd)
        : await addSinglesGameAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cancelEdit();
      router.refresh();
    });
  };

  const remove = (matchId: string) => {
    if (!window.confirm("¿Borrar este game?")) return;
    setError(null);
    const fd = new FormData();
    fd.set("matchId", matchId);
    startTransition(async () => {
      const result = await deleteSinglesGameAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (editingId === matchId) cancelEdit();
      router.refresh();
    });
  };

  return (
    <section className="animate-rise mt-8">
      <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        Games (singles)
      </h2>

      {games.length === 0 ? (
        <p className="mb-4 text-[0.9rem] text-muted">Sin games todavía.</p>
      ) : (
        <ul className="mb-4 overflow-hidden rounded-2xl bg-sand">
          {games.map((m, i) => {
            const a =
              labelPlayers.find((p) => p.id === m.sideA[0])?.displayName ??
              "?";
            const b =
              labelPlayers.find((p) => p.id === m.sideB[0])?.displayName ??
              "?";
            return (
              <li
                key={m.id}
                className="border-b border-ink/6 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[0.75rem] font-medium text-muted">
                      Game {i + 1}
                    </p>
                    <p className="mt-0.5 text-[0.95rem]">
                      <span
                        className={
                          m.winnerSide === "A"
                            ? "font-medium text-ink"
                            : "text-muted"
                        }
                      >
                        {a}
                      </span>
                      <span className="mx-1.5 text-muted">vs</span>
                      <span
                        className={
                          m.winnerSide === "B"
                            ? "font-medium text-ink"
                            : "text-muted"
                        }
                      >
                        {b}
                      </span>
                    </p>
                  </div>
                  <span className="shrink-0 text-[1.15rem] font-semibold tabular-nums tracking-tight text-ink">
                    {m.score}
                  </span>
                </div>
                {canManage ? (
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => startEdit(m)}
                      className="text-[0.8rem] font-medium text-ink"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(m.id)}
                      className="text-[0.8rem] font-medium text-danger"
                    >
                      Borrar
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {canManage ? (
        <form
          className="space-y-4 rounded-2xl bg-sand px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <p className="text-[0.9rem] font-medium text-ink">
              {editingId ? "Editar game" : "Singles"}
            </p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              Elige dos asistentes y el marcador (ej. 6-4).
            </p>
          </div>

          <label className="block text-[0.8rem] text-muted">
            Jugador 1
            <select
              value={draft.player1Id}
              onChange={(e) =>
                setDraft((d) => ({ ...d, player1Id: e.target.value }))
              }
              className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
            >
              {players.length === 0 ? (
                <option value="">Sin asistentes</option>
              ) : (
                players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block text-[0.8rem] text-muted">
            Jugador 2
            <select
              value={draft.player2Id}
              onChange={(e) =>
                setDraft((d) => ({ ...d, player2Id: e.target.value }))
              }
              className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
            >
              {players.length < 2 ? (
                <option value="">Falta otro asistente</option>
              ) : (
                players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))
              )}
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
                value={draft.games1}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, games1: e.target.value }))
                }
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
                value={draft.games2}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, games2: e.target.value }))
                }
                placeholder="4"
                required
                aria-label="Games jugador 2"
                className="w-full rounded-xl bg-mist-2 px-3 py-2.5 text-center text-[1.1rem] font-semibold tabular-nums text-ink placeholder:font-normal placeholder:text-muted"
              />
            </div>
          </div>

          {error ? <p className="text-[0.9rem] text-danger">{error}</p> : null}

          <div className="flex gap-2">
            {editingId ? (
              <button
                type="button"
                disabled={pending}
                onClick={cancelEdit}
                className="flex-1 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-medium text-muted"
              >
                Cancelar
              </button>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ball py-3 text-[0.95rem] font-semibold text-on-ball disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Spinner />
                  Guardando…
                </>
              ) : editingId ? (
                "Guardar game"
              ) : (
                "Aceptar game"
              )}
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl bg-sand px-4 py-4 text-[0.9rem] text-muted">
          Marca <strong className="font-medium text-ink">Voy</strong> para
          agregar o editar games.
        </p>
      )}
    </section>
  );
}
