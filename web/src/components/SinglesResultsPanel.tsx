"use client";

import { useEffect, useRef, useState } from "react";
import type { Match, MatchUnit, Player } from "@/lib/domain/types";
import {
  addSinglesLooseGameAction,
  addSinglesSetAction,
  deleteSinglesResultAction,
  restoreSinglesResultAction,
  updateSinglesLooseGameAction,
  updateSinglesSetAction,
} from "@/lib/actions/sessions";
import { formatChatTime } from "@/lib/format";
import type { MatchChangeLogEntry } from "@/lib/matches/changelog";
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
  /** null = still choosing / En curso */
  winnerSide: "A" | "B" | null;
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
    winnerSide: null,
  };
}

function setDraftFromMatch(m: Match): SetDraft {
  const [g1 = "", g2 = ""] = m.score ? m.score.split("-") : ["", ""];
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

function isInProgress(m: Match) {
  return m.winnerSide !== "A" && m.winnerSide !== "B";
}

function tempMatchId() {
  return `tmp-${crypto.randomUUID()}`;
}

function isTempMatchId(id: string) {
  return id.startsWith("tmp-");
}

function validateSetScore(
  games1Raw: string,
  games2Raw: string,
): { ok: true; score: string; winnerSide: "A" | "B" } | { ok: false; error: string } {
  const games1 = Number(games1Raw);
  const games2 = Number(games2Raw);
  if (
    !Number.isInteger(games1) ||
    !Number.isInteger(games2) ||
    games1 < 0 ||
    games2 < 0 ||
    games1 > 99 ||
    games2 > 99
  ) {
    return { ok: false, error: "Marcador inválido" };
  }
  if (games1 === games2) {
    return {
      ok: false,
      error: "El set no puede empatar — tiene que haber un ganador",
    };
  }
  if (games1 < 6 && games2 < 6) {
    return {
      ok: false,
      error: "En un set al menos un lado debe llegar a 6",
    };
  }
  return {
    ok: true,
    score: `${games1}-${games2}`,
    winnerSide: games1 > games2 ? "A" : "B",
  };
}

export function SinglesResultsPanel({
  playSessionId,
  players,
  labelPlayers,
  results,
  changeLog,
  canManage,
  gamesOpen,
}: {
  playSessionId: string;
  /** Asistentes Voy — opciones del form */
  players: Player[];
  /** Para mostrar nombres en la lista (todos los miembros) */
  labelPlayers: Player[];
  /** Active (non-deleted) singles results */
  results: Match[];
  changeLog: MatchChangeLogEntry[];
  canManage: boolean;
  gamesOpen: boolean;
}) {
  const [local, setLocal] = useState(results);
  const [logs, setLogs] = useState(changeLog);
  const [formKind, setFormKind] = useState<FormKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [setDraft, setSetDraft] = useState<SetDraft>(() => emptySetDraft(players));
  const [gameDraft, setGameDraft] = useState<GameDraft>(() =>
    emptyGameDraft(players),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(0);

  useEffect(() => {
    // Don't clobber optimistic rows while a mutation is still syncing.
    if (inFlight.current === 0) {
      setLocal(results);
      setLogs(changeLog);
    }
  }, [results, changeLog]);

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
  };

  const runMutation = ({
    applyOptimistic,
    rollback,
    mutate,
    replaceTempId,
  }: {
    applyOptimistic: () => void;
    rollback: () => void;
    mutate: () => Promise<
      | { ok: true; match?: Match; log?: MatchChangeLogEntry }
      | { ok: false; error: string }
    >;
    replaceTempId?: string;
  }) => {
    setError(null);
    applyOptimistic();
    resetForm();

    inFlight.current += 1;
    setPending(true);
    void (async () => {
      try {
        const result = await mutate();
        if (!result.ok) {
          rollback();
          setError(result.error);
          return;
        }
        if (result.log) {
          const entry = result.log;
          setLogs((prev) => [entry, ...prev]);
        }
        if (result.match) {
          const serverMatch = result.match;
          setLocal((prev) => {
            if (serverMatch.deletedAt) {
              return prev.filter(
                (row) =>
                  row.id !== serverMatch.id && row.id !== replaceTempId,
              );
            }
            if (replaceTempId) {
              const withoutTemp = prev.filter((row) => row.id !== replaceTempId);
              if (withoutTemp.some((row) => row.id === serverMatch.id)) {
                return withoutTemp.map((row) =>
                  row.id === serverMatch.id ? serverMatch : row,
                );
              }
              return [...withoutTemp, serverMatch];
            }
            if (prev.some((row) => row.id === serverMatch.id)) {
              return prev.map((row) =>
                row.id === serverMatch.id ? serverMatch : row,
              );
            }
            return [...prev, serverMatch];
          });
          if (!serverMatch.deletedAt && result.log?.action === "restored") {
            setLogs((prev) =>
              prev.map((entry) =>
                entry.matchId === serverMatch.id
                  ? { ...entry, restorable: false }
                  : entry,
              ),
            );
          }
        }
      } catch {
        rollback();
        setError("No se pudo guardar");
      } finally {
        inFlight.current -= 1;
        if (inFlight.current === 0) setPending(false);
      }
    })();
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

  const submitSet = (asInProgress: boolean) => {
    setError(null);
    if (!setDraft.player1Id || !setDraft.player2Id) {
      setError("Hacen falta dos jugadores distintos para registrar el set");
      return;
    }
    if (setDraft.player1Id === setDraft.player2Id) {
      setError("Los jugadores tienen que ser distintos");
      return;
    }

    let score = "";
    let winnerSide: "A" | "B" | null = null;
    if (asInProgress) {
      score = "";
      winnerSide = null;
    } else {
      if (!setDraft.games1.trim() || !setDraft.games2.trim()) {
        setError("Ingresa el marcador o guarda como En curso");
        return;
      }
      const parsed = validateSetScore(setDraft.games1, setDraft.games2);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      score = parsed.score;
      winnerSide = parsed.winnerSide;
    }

    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("player1Id", setDraft.player1Id);
    fd.set("player2Id", setDraft.player2Id);
    if (asInProgress) {
      fd.set("games1", "");
      fd.set("games2", "");
    } else {
      fd.set("games1", setDraft.games1);
      fd.set("games2", setDraft.games2);
    }

    if (editingId) {
      fd.set("matchId", editingId);
      const id = editingId;
      const before = local.find((row) => row.id === id);
      if (!before) return;
      const next: Match = {
        ...before,
        sideA: [setDraft.player1Id],
        sideB: [setDraft.player2Id],
        score,
        winnerSide,
      };
      runMutation({
        applyOptimistic: () => {
          setLocal((prev) => prev.map((row) => (row.id === id ? next : row)));
        },
        rollback: () => {
          setLocal((prev) => prev.map((row) => (row.id === id ? before : row)));
        },
        mutate: () => updateSinglesSetAction(fd),
      });
      return;
    }

    const tempId = tempMatchId();
    const optimistic: Match = {
      id: tempId,
      sessionId: playSessionId,
      format: "singles",
      unit: "set",
      sideA: [setDraft.player1Id],
      sideB: [setDraft.player2Id],
      score,
      winnerSide,
      createdAt: new Date().toISOString(),
    };
    runMutation({
      applyOptimistic: () => setLocal((prev) => [...prev, optimistic]),
      rollback: () =>
        setLocal((prev) => prev.filter((row) => row.id !== tempId)),
      mutate: () => addSinglesSetAction(fd),
      replaceTempId: tempId,
    });
  };

  const submitGame = (asInProgress: boolean) => {
    setError(null);
    if (!gameDraft.player1Id || !gameDraft.player2Id) {
      setError("Hacen falta dos jugadores distintos para registrar el game");
      return;
    }
    if (gameDraft.player1Id === gameDraft.player2Id) {
      setError("Los jugadores tienen que ser distintos");
      return;
    }
    if (!asInProgress && !gameDraft.winnerSide) {
      setError("Elige quién ganó o guarda como En curso");
      return;
    }

    const winnerSide = asInProgress ? null : gameDraft.winnerSide;
    const score = winnerSide ? "1-0" : "";

    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("player1Id", gameDraft.player1Id);
    fd.set("player2Id", gameDraft.player2Id);
    if (winnerSide) fd.set("winnerSide", winnerSide);

    if (editingId) {
      fd.set("matchId", editingId);
      const id = editingId;
      const before = local.find((row) => row.id === id);
      if (!before) return;
      const next: Match = {
        ...before,
        sideA: [gameDraft.player1Id],
        sideB: [gameDraft.player2Id],
        score,
        winnerSide,
      };
      runMutation({
        applyOptimistic: () => {
          setLocal((prev) => prev.map((row) => (row.id === id ? next : row)));
        },
        rollback: () => {
          setLocal((prev) => prev.map((row) => (row.id === id ? before : row)));
        },
        mutate: () => updateSinglesLooseGameAction(fd),
      });
      return;
    }

    const tempId = tempMatchId();
    const optimistic: Match = {
      id: tempId,
      sessionId: playSessionId,
      format: "singles",
      unit: "game",
      sideA: [gameDraft.player1Id],
      sideB: [gameDraft.player2Id],
      score,
      winnerSide,
      createdAt: new Date().toISOString(),
    };
    runMutation({
      applyOptimistic: () => setLocal((prev) => [...prev, optimistic]),
      rollback: () =>
        setLocal((prev) => prev.filter((row) => row.id !== tempId)),
      mutate: () => addSinglesLooseGameAction(fd),
      replaceTempId: tempId,
    });
  };

  const setGameWinner = (m: Match, winnerSide: "A" | "B") => {
    const fd = new FormData();
    fd.set("playSessionId", playSessionId);
    fd.set("matchId", m.id);
    fd.set("player1Id", m.sideA[0] ?? "");
    fd.set("player2Id", m.sideB[0] ?? "");
    fd.set("winnerSide", winnerSide);

    const before = m;
    runMutation({
      applyOptimistic: () => {
        setLocal((prev) =>
          prev.map((row) =>
            row.id === m.id ? { ...row, winnerSide, score: "1-0" } : row,
          ),
        );
      },
      rollback: () => {
        setLocal((prev) =>
          prev.map((row) => (row.id === m.id ? before : row)),
        );
      },
      mutate: () => updateSinglesLooseGameAction(fd),
    });
  };

  const remove = (matchId: string) => {
    if (
      !window.confirm(
        "¿Borrar este resultado? Quedará en el historial y se podrá restaurar.",
      )
    ) {
      return;
    }
    const removed = local.find((m) => m.id === matchId);
    if (!removed) return;
    const fd = new FormData();
    fd.set("matchId", matchId);
    const index = local.findIndex((m) => m.id === matchId);
    const logsBefore = logs;
    runMutation({
      applyOptimistic: () => {
        setLocal((prev) => prev.filter((m) => m.id !== matchId));
        if (editingId === matchId) resetForm();
      },
      rollback: () => {
        setLogs(logsBefore);
        setLocal((prev) => {
          if (prev.some((m) => m.id === matchId)) return prev;
          const next = prev.slice();
          next.splice(Math.min(index, next.length), 0, removed);
          return next;
        });
      },
      mutate: () => deleteSinglesResultAction(fd),
    });
  };

  const restore = (matchId: string) => {
    const fd = new FormData();
    fd.set("matchId", matchId);
    const logsBefore = logs;
    runMutation({
      applyOptimistic: () => {
        setLogs((prev) =>
          prev.map((entry) =>
            entry.matchId === matchId ? { ...entry, restorable: false } : entry,
          ),
        );
      },
      rollback: () => setLogs(logsBefore),
      mutate: () => restoreSinglesResultAction(fd),
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

  const playersReady =
    players.length >= 2 &&
    Boolean(setDraft.player1Id) &&
    Boolean(setDraft.player2Id) &&
    setDraft.player1Id !== setDraft.player2Id;

  const gamePlayersReady =
    players.length >= 2 &&
    Boolean(gameDraft.player1Id) &&
    Boolean(gameDraft.player2Id) &&
    gameDraft.player1Id !== gameDraft.player2Id;

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
            const enCurso = isInProgress(m);
            return (
              <li
                key={m.id}
                className="border-b border-ink/6 px-4 py-3 last:border-b-0"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {unitBadge(m.unit)}
                      {enCurso ? (
                        <span className="rounded-md bg-ball/20 px-1.5 py-0.5 text-[0.7rem] font-medium text-ink">
                          En curso
                        </span>
                      ) : null}
                    </div>
                    {enCurso ? (
                      <p className="text-[0.95rem] leading-snug text-ink">
                        {a}
                        <span className="mx-1.5 text-muted">vs</span>
                        {b}
                      </p>
                    ) : m.unit === "game" ? (
                      <p className="text-[0.95rem] leading-snug">
                        <span className="font-semibold text-ink">
                          {m.winnerSide === "A" ? a : b}
                        </span>
                        <span className="text-muted"> ganó a </span>
                        <span className="text-muted">
                          {m.winnerSide === "A" ? b : a}
                        </span>
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
                  {!enCurso && m.unit === "set" ? (
                    <span className="shrink-0 text-[1.15rem] font-semibold tabular-nums tracking-tight text-ink">
                      {m.score}
                    </span>
                  ) : null}
                </div>

                {canManage && enCurso && m.unit === "game" ? (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[0.75rem] text-muted">Ganó</p>
                    <div
                      className="flex gap-1 rounded-xl bg-mist-2 p-1"
                      role="group"
                      aria-label="Quién ganó el game"
                    >
                      <button
                        type="button"
                        disabled={isTempMatchId(m.id)}
                        onClick={() => setGameWinner(m, "A")}
                        className="flex-1 rounded-[0.65rem] px-2 py-2 text-[0.85rem] font-medium text-ink transition hover:bg-sand disabled:opacity-60"
                      >
                        {a}
                      </button>
                      <button
                        type="button"
                        disabled={isTempMatchId(m.id)}
                        onClick={() => setGameWinner(m, "B")}
                        className="flex-1 rounded-[0.65rem] px-2 py-2 text-[0.85rem] font-medium text-ink transition hover:bg-sand disabled:opacity-60"
                      >
                        {b}
                      </button>
                    </div>
                  </div>
                ) : null}

                {canManage && enCurso && m.unit === "set" ? (
                  <button
                    type="button"
                    disabled={isTempMatchId(m.id)}
                    onClick={() => startEdit(m)}
                    className="mt-2 text-[0.8rem] font-medium text-ink disabled:opacity-60"
                  >
                    Registrar marcador
                  </button>
                ) : null}

                {canManage ? (
                  <div className="mt-2 flex gap-3">
                    {!enCurso || m.unit === "game" ? (
                      <button
                        type="button"
                        disabled={isTempMatchId(m.id)}
                        onClick={() => startEdit(m)}
                        className="text-[0.8rem] font-medium text-ink disabled:opacity-60"
                      >
                        Editar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={isTempMatchId(m.id)}
                      onClick={() => remove(m.id)}
                      className="text-[0.8rem] font-medium text-danger disabled:opacity-60"
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
            disabled={players.length < 1}
            onClick={() => openAdd("game")}
            className="flex-1 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-semibold text-ink disabled:opacity-60"
          >
            Agregar Game
          </button>
          <button
            type="button"
            disabled={players.length < 1}
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
            const hasScore =
              Boolean(setDraft.games1.trim()) &&
              Boolean(setDraft.games2.trim());
            submitSet(!hasScore);
          }}
        >
          <div>
            <p className="text-[0.9rem] font-medium text-ink">
              {editingId ? "Editar set" : "Agregar set"}
            </p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              Primero los jugadores (En curso). El marcador lo puedes poner
              después.
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
            <p className="mb-1 text-[0.8rem] text-muted">
              Marcador (opcional)
            </p>
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

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending || !playersReady}
              onClick={() => submitSet(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-semibold text-ink disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Spinner />
                  Guardando…
                </>
              ) : (
                "En curso"
              )}
            </button>
            <FormActions
              pending={pending}
              canSubmit={
                playersReady &&
                Boolean(setDraft.games1.trim()) &&
                Boolean(setDraft.games2.trim())
              }
              editing={Boolean(editingId)}
              onCancel={resetForm}
              submitLabel={editingId ? "Guardar set" : "Aceptar set"}
            />
          </div>
        </form>
      ) : null}

      {canManage && formKind === "game" ? (
        <form
          className="mt-3 space-y-4 rounded-2xl bg-sand px-4 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submitGame(!gameDraft.winnerSide);
          }}
        >
          <div>
            <p className="text-[0.9rem] font-medium text-ink">
              {editingId ? "Editar game" : "Agregar game"}
            </p>
            <p className="mt-0.5 text-[0.8rem] text-muted">
              Primero los jugadores (En curso). El ganador lo puedes marcar
              después.
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
            <p className="mb-2 text-[0.8rem] text-muted">Ganó (opcional)</p>
            <div
              className="flex gap-1 rounded-xl bg-mist-2 p-1"
              role="group"
              aria-label="Quién ganó el game"
            >
              <button
                type="button"
                onClick={() =>
                  setGameDraft((d) => ({
                    ...d,
                    winnerSide: d.winnerSide === "A" ? null : "A",
                  }))
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
                  setGameDraft((d) => ({
                    ...d,
                    winnerSide: d.winnerSide === "B" ? null : "B",
                  }))
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

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={pending || !gamePlayersReady}
              onClick={() => submitGame(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-mist-2 py-3 text-[0.95rem] font-semibold text-ink disabled:opacity-60"
            >
              {pending ? (
                <>
                  <Spinner />
                  Guardando…
                </>
              ) : (
                "En curso"
              )}
            </button>
            <FormActions
              pending={pending}
              canSubmit={gamePlayersReady && Boolean(gameDraft.winnerSide)}
              editing={Boolean(editingId)}
              onCancel={resetForm}
              submitLabel={editingId ? "Guardar game" : "Aceptar game"}
            />
          </div>
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

      {canManage && pending ? (
        <p className="mt-2 text-[0.75rem] text-muted">Sincronizando…</p>
      ) : null}

      <div className="mt-8">
        <h3 className="mb-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Historial de cambios
        </h3>
        <p className="mb-3 text-[0.8rem] text-muted">
          Quién agregó, editó, borró o restauró un resultado en esta fecha.
        </p>
        {logs.length === 0 ? (
          <p className="text-[0.9rem] text-muted">Sin cambios todavía.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-sand">
            {logs.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-ink/6 px-4 py-3 text-[0.85rem] last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-ink">
                      <span className="font-medium">{entry.actorDisplayName}</span>
                      <span className="text-muted"> · {entry.summary}</span>
                    </p>
                    <p className="mt-0.5 text-[0.75rem] text-muted">
                      {formatChatTime(entry.createdAt)}
                    </p>
                  </div>
                  {canManage && entry.restorable && entry.matchId ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => restore(entry.matchId!)}
                      className="shrink-0 text-[0.8rem] font-medium text-ink disabled:opacity-60"
                    >
                      Restaurar
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
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
