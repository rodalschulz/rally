"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Match, MatchUnit, Player } from "@/lib/domain/types";
import {
  addSinglesLooseGameAction,
  addSinglesSetAction,
  deleteSinglesResultAction,
  updateSinglesLooseGameAction,
  updateSinglesSetAction,
} from "@/lib/actions/sessions";
import { Spinner } from "@/components/Spinner";

type FormKind = "game" | "set";

type SetDraft = {
  player1Id: string;
  player2Id: string;
  games1: string;
  games2: string;
};

type GameDraft = {
  player1Id: string;
  player2Id: string;
  winnerSide: "A" | "B";
};

function emptySetDraft(players: Player[]): SetDraft {
  return {
    player1Id: players[0]?.id ?? "",
    player2Id: players[1]?.id ?? "",
    games1: "",
    games2: "",
  };
}

function emptyGameDraft(players: Player[]): GameDraft {
  return {
    player1Id: players[0]?.id ?? "",
    player2Id: players[1]?.id ?? "",
    winnerSide: "A",
  };
}

function setDraftFromMatch(m: Match): SetDraft {
  const [g1 = "", g2 = ""] = m.score.split("-");
  return {
    player1Id: m.sideA[0] ?? "",
    player2Id: m.sideB[0] ?? "",
    games1: g1,
    games2: g2,
  };
}

function gameDraftFromMatch(m: Match): GameDraft {
  return {
    player1Id: m.sideA[0] ?? "",
    player2Id: m.sideB[0] ?? "",
    winnerSide: m.winnerSide,
  };
}

function nameOf(players: Player[], id: string | undefined) {
  return players.find((p) => p.id === id)?.displayName ?? "?";
}

export function SinglesResultsPanel({
  playSessionId,
  players,
  labelPlayers,
  results,
  canManage,
  gamesOpen,
}: {
  playSessionId: string;
  /** Asistentes Voy — opciones del form */
  players: Player[];
  /** Para mostrar nombres en la lista (todos los miembros) */
  labelPlayers: Player[];
  results: Match[];
  canManage: boolean;
  gamesOpen: boolean;
}) {
  const router = useRouter();
  const [local, setLocal] = useState(results);
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [setDraft, setSetDraft] = useState<SetDraft>(() => emptySetDraft(players));
  const [gameDraft, setGameDraft] = useState<GameDraft>(() =>
    emptyGameDraft(players),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLocal(results);
  }, [results]);

  useEffect(() => {
    if (!editingId) {
      setSetDraft(emptySetDraft(players));
      setGameDraft(emptyGameDraft(players));
    }
  }, [players, editingId]);

  const resetForm = () => {
    setFormKind(null);
    setEditingId(null);
    setSetDraft(emptySetDraft(players));
    setGameDraft(emptyGameDraft(players));
    setError(null);
  };

  const openAdd = (kind: FormKind) => {
    setFormKind(kind);
    setEditingId(null);
    setSetDraft(emptySetDraft(players));
    setGameDraft(emptyGameDraft(players));
    setError(null);
  };

  const startEdit = (m: Match) => {
    const kind: FormKind = m.unit === "game" ? "game" : "set";
    setFormKind(kind);
    setEditingId(m.id);
    if (kind === "set") setSetDraft(setDraftFromMatch(m));
    else setGameDraft(gameDraftFromMatch(m));
    setError(null);
  };

  const submitSet = () => {
    setError(null);
    if (!setDraft.player1Id || !setDraft.player2Id) {
      setError("Hacen falta dos jugadores distintos para registrar el set");
      return;
    }
    if (setDraft.player1Id === setDraft.player2Id) {
      setError("Los jugadores tienen que ser distintos");
      return;
    }

    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("player1Id", setDraft.player1Id);
    fd.set("player2Id", setDraft.player2Id);
    fd.set("games1", setDraft.games1);
    fd.set("games2", setDraft.games2);
    if (editingId) fd.set("matchId", editingId);

    startTransition(async () => {
      const result = editingId
        ? await updateSinglesSetAction(fd)
        : await addSinglesSetAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  };

  const submitGame = () => {
    setError(null);
    if (!gameDraft.player1Id || !gameDraft.player2Id) {
      setError("Hacen falta dos jugadores distintos para registrar el game");
      return;
    }
    if (gameDraft.player1Id === gameDraft.player2Id) {
      setError("Los jugadores tienen que ser distintos");
      return;
    }

    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("player1Id", gameDraft.player1Id);
    fd.set("player2Id", gameDraft.player2Id);
    fd.set("winnerSide", gameDraft.winnerSide);
    if (editingId) fd.set("matchId", editingId);

    startTransition(async () => {
      const result = editingId
        ? await updateSinglesLooseGameAction(fd)
        : await addSinglesLooseGameAction(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      resetForm();
      router.refresh();
    });
  };

  const remove = (matchId: string) => {
    if (!window.confirm("¿Borrar este resultado?")) return;
    setError(null);
    const previous = local;
    setLocal((prev) => prev.filter((m) => m.id !== matchId));
    if (editingId === matchId) resetForm();
    const fd = new FormData();
    fd.set("matchId", matchId);
    startTransition(async () => {
      const result = await deleteSinglesResultAction(fd);
      if (!result.ok) {
        setLocal(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const unitBadge = (unit: MatchUnit) =>
    unit === "game" ? (
      <span className="rounded-md bg-mist-2 px-1.5 py-0.5 text-[0.7rem] font-medium text-muted">
        Game
      </span>
    ) : (
      <span className="rounded-md bg-mist-2 px-1.5 py-0.5 text-[0.7rem] font-medium text-muted">
        Set
      </span>
    );

  return (
    <section className="animate-rise mt-8">
      <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        Resultados
      </h2>

      {local.length === 0 ? (
        <p className="mb-4 text-[0.9rem] text-muted">Sin resultados todavía.</p>
      ) : (
        <ul className="mb-4 overflow-hidden rounded-2xl bg-sand">
          {local.map((m) => {
            const a = nameOf(labelPlayers, m.sideA[0]);
            const b = nameOf(labelPlayers, m.sideB[0]);
            const winnerName = m.winnerSide === "A" ? a : b;
            const loserName = m.winnerSide === "A" ? b : a;
            return (
              <li
                key={m.id}
                className="border-b border-ink/6 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1">{unitBadge(m.unit)}</div>
                    {m.unit === "game" ? (
                      <p className="text-[0.95rem] leading-snug">
                        <span className="font-semibold text-ink">
                          {winnerName}
                        </span>
                        <span className="text-muted"> ganó a </span>
                        <span className="text-muted">{loserName}</span>
                      </p>
                    ) : (
                      <p className="text-[0.95rem] leading-snug">
                        <span
                          className={
                            m.winnerSide === "A"
                              ? "font-semibold text-ink"
                              : "text-muted"
                          }
                        >
                          {a}
                        </span>
                        <span className="mx-1.5 text-muted">vs</span>
                        <span
                          className={
                            m.winnerSide === "B"
                              ? "font-semibold text-ink"
                              : "text-muted"
                          }
                        >
                          {b}
                        </span>
                      </p>
                    )}
                  </div>
                  {m.unit === "set" ? (
                    <span className="shrink-0 text-[1.15rem] font-semibold tabular-nums tracking-tight text-ink">
                      {m.score}
                    </span>
                  ) : null}
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

      {canManage && !formKind ? (
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending || players.length < 1}
            onClick={() => openAdd("game")}
            className="flex-1 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-semibold text-ink disabled:opacity-60"
          >
            Agregar Game
          </button>
          <button
            type="button"
            disabled={pending || players.length < 1}
            onClick={() => openAdd("set")}
            className="flex-1 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-semibold text-ink disabled:opacity-60"
          >
            Agregar Set
          </button>
        </div>
      ) : null}

      {canManage && formKind === "set" ? (
        <form
          className="mt-3 space-y-4 rounded-2xl bg-sand px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitSet();
          }}
        >
          <div>
            <p className="text-[0.9rem] font-medium text-ink">
              {editingId ? "Editar set" : "Agregar set"}
            </p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              Elige dos asistentes y el marcador de games (ej. 6-4).
            </p>
          </div>

          <PlayerSelects
            players={players}
            player1Id={setDraft.player1Id}
            player2Id={setDraft.player2Id}
            onPlayer1={(id) => setSetDraft((d) => ({ ...d, player1Id: id }))}
            onPlayer2={(id) => setSetDraft((d) => ({ ...d, player2Id: id }))}
          />

          <div>
            <p className="mb-1 text-[0.8rem] text-muted">Marcador</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={setDraft.games1}
                onChange={(e) =>
                  setSetDraft((d) => ({ ...d, games1: e.target.value }))
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
                value={setDraft.games2}
                onChange={(e) =>
                  setSetDraft((d) => ({ ...d, games2: e.target.value }))
                }
                placeholder="4"
                required
                aria-label="Games jugador 2"
                className="w-full rounded-xl bg-mist-2 px-3 py-2.5 text-center text-[1.1rem] font-semibold tabular-nums text-ink placeholder:font-normal placeholder:text-muted"
              />
            </div>
          </div>

          {players.length < 2 ? (
            <p className="text-[0.85rem] text-muted">
              Falta otro asistente con Voy para poder guardar.
            </p>
          ) : null}
          {error ? <p className="text-[0.9rem] text-danger">{error}</p> : null}

          <FormActions
            pending={pending}
            canSubmit={
              players.length >= 2 &&
              Boolean(setDraft.player1Id) &&
              Boolean(setDraft.player2Id) &&
              setDraft.player1Id !== setDraft.player2Id
            }
            editing={Boolean(editingId)}
            onCancel={resetForm}
            submitLabel={editingId ? "Guardar set" : "Aceptar set"}
          />
        </form>
      ) : null}

      {canManage && formKind === "game" ? (
        <form
          className="mt-3 space-y-4 rounded-2xl bg-sand px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitGame();
          }}
        >
          <div>
            <p className="text-[0.9rem] font-medium text-ink">
              {editingId ? "Editar game" : "Agregar game"}
            </p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              Un game suelto: elige dos asistentes y quién ganó.
            </p>
          </div>

          <PlayerSelects
            players={players}
            player1Id={gameDraft.player1Id}
            player2Id={gameDraft.player2Id}
            onPlayer1={(id) => setGameDraft((d) => ({ ...d, player1Id: id }))}
            onPlayer2={(id) => setGameDraft((d) => ({ ...d, player2Id: id }))}
          />

          <div>
            <p className="mb-2 text-[0.8rem] text-muted">Ganó</p>
            <div
              className="flex gap-1 rounded-xl bg-mist-2 p-1"
              role="group"
              aria-label="Quién ganó el game"
            >
              <button
                type="button"
                onClick={() =>
                  setGameDraft((d) => ({ ...d, winnerSide: "A" }))
                }
                className={`flex-1 rounded-[0.65rem] px-2 py-2.5 text-[0.9rem] font-medium transition ${
                  gameDraft.winnerSide === "A"
                    ? "bg-sand text-ink shadow-sm ring-1 ring-ball/70"
                    : "text-muted"
                }`}
              >
                {nameOf(players, gameDraft.player1Id)}
              </button>
              <button
                type="button"
                onClick={() =>
                  setGameDraft((d) => ({ ...d, winnerSide: "B" }))
                }
                className={`flex-1 rounded-[0.65rem] px-2 py-2.5 text-[0.9rem] font-medium transition ${
                  gameDraft.winnerSide === "B"
                    ? "bg-sand text-ink shadow-sm ring-1 ring-ball/70"
                    : "text-muted"
                }`}
              >
                {nameOf(players, gameDraft.player2Id)}
              </button>
            </div>
          </div>

          {players.length < 2 ? (
            <p className="text-[0.85rem] text-muted">
              Falta otro asistente con Voy para poder guardar.
            </p>
          ) : null}
          {error ? <p className="text-[0.9rem] text-danger">{error}</p> : null}

          <FormActions
            pending={pending}
            canSubmit={
              players.length >= 2 &&
              Boolean(gameDraft.player1Id) &&
              Boolean(gameDraft.player2Id) &&
              gameDraft.player1Id !== gameDraft.player2Id
            }
            editing={Boolean(editingId)}
            onCancel={resetForm}
            submitLabel={editingId ? "Guardar game" : "Aceptar game"}
          />
        </form>
      ) : null}

      {!canManage ? (
        <p className="rounded-2xl bg-sand px-4 py-4 text-[0.9rem] text-muted">
          {!gamesOpen ? (
            "Ya cerró el plazo para agregar o editar resultados."
          ) : (
            <>
              Marca <strong className="font-medium text-ink">Voy</strong> para
              agregar o editar resultados.
            </>
          )}
        </p>
      ) : null}

      {canManage && error && !formKind ? (
        <p className="mt-3 text-[0.9rem] text-danger">{error}</p>
      ) : null}
    </section>
  );
}

function PlayerSelects({
  players,
  player1Id,
  player2Id,
  onPlayer1,
  onPlayer2,
}: {
  players: Player[];
  player1Id: string;
  player2Id: string;
  onPlayer1: (id: string) => void;
  onPlayer2: (id: string) => void;
}) {
  return (
    <>
      <label className="block text-[0.8rem] text-muted">
        Jugador 1
        <select
          value={player1Id}
          onChange={(e) => onPlayer1(e.target.value)}
          className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
        >
          {players.length === 0 ? (
            <option value="">Sin asistentes</option>
          ) : (
            players.map((p) => (
              <option
                key={p.id}
                value={p.id}
                disabled={Boolean(player2Id) && p.id === player2Id}
              >
                {p.displayName}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="block text-[0.8rem] text-muted">
        Jugador 2
        <select
          value={player2Id}
          onChange={(e) => onPlayer2(e.target.value)}
          className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
        >
          {players.length < 2 ? (
            <option value="">Falta otro asistente</option>
          ) : (
            players.map((p) => (
              <option
                key={p.id}
                value={p.id}
                disabled={Boolean(player1Id) && p.id === player1Id}
              >
                {p.displayName}
              </option>
            ))
          )}
        </select>
      </label>
    </>
  );
}

function FormActions({
  pending,
  canSubmit,
  editing,
  onCancel,
  submitLabel,
}: {
  pending: boolean;
  canSubmit: boolean;
  editing: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className="flex-1 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-medium text-muted"
      >
        {editing ? "Cancelar" : "Cerrar"}
      </button>
      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-ball py-3 text-[0.95rem] font-semibold text-on-ball disabled:opacity-60"
      >
        {pending ? (
          <>
            <Spinner />
            Guardando…
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
