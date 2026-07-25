import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/AppShell";
import { AttendanceBadge, RsvpStrip } from "@/components/AttendanceUi";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  getPlaySession,
  listPlayers,
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/data/queries";
import { roundMoney } from "@/lib/domain/split";
import { formatSessionWhen, formatSoles } from "@/lib/format";
import { addMatchAction } from "@/lib/actions/sessions";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "nueva") notFound();

  const [row, sessionAuth, allPlayers] = await Promise.all([
    getPlaySession(id),
    auth(),
    listPlayers(),
  ]);
  if (!row) notFound();

  const session = toSession(row);
  const when = formatSessionWhen(session.startsAt);
  const sessionAtt = row.attendances.map(toAttendance);
  const attByUser = new Map(sessionAtt.map((a) => [a.playerId, a.status]));
  const myAtt =
    sessionAtt.find((a) => a.playerId === sessionAuth?.user?.id)?.status ??
    "pending";
  const financier = toPlayer(row.financier);
  const going = sessionAtt.filter((a) => a.status === "going");
  const share =
    going.length > 0 ? roundMoney(session.costAmount / going.length) : 0;
  const sessionDebts = row.debts.map(toDebt);
  const sessionMatches = row.matches.map(toMatch);
  const goingPlayers = allPlayers.filter((p) =>
    going.some((a) => a.playerId === p.id),
  );
  // Prefer who marked "Voy"; fall back to everyone registered
  const matchPlayers =
    goingPlayers.length >= 2 ? goingPlayers : allPlayers;
  const canAddMatch = matchPlayers.length >= 2;

  return (
    <AppShell title={when.weekday} subtitle={when.dayMonth}>
      <Link
        href="/"
        className="mb-5 inline-flex text-[0.9rem] font-medium text-muted"
      >
        ← Fechas
      </Link>

      <section className="animate-rise">
        <p className="text-[0.8rem] font-medium text-muted">
          {session.courtLabel ?? "Cancha"}
        </p>
        <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.03em] text-ink">
          {when.time}
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">{when.label}</p>
        {session.note ? (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {session.note}
          </p>
        ) : null}
      </section>

      <section className="animate-rise mt-8">
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Tu asistencia
        </h2>
        <RsvpStrip playSessionId={session.id} current={myAtt} />
      </section>

      <section className="animate-rise mt-8">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
            Grupo
          </h2>
          <p className="text-[0.8rem] text-muted">{going.length} confirmados</p>
        </div>
        <ul className="overflow-hidden rounded-2xl bg-sand">
          {allPlayers.map((player) => {
            const status = attByUser.get(player.id) ?? "pending";
            const isFinancier = player.id === session.financierId;
            return (
              <li
                key={player.id}
                className="flex items-center gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
              >
                <PlayerAvatar player={player} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">
                    {player.displayName}
                    {isFinancier ? (
                      <span className="ml-2 text-[0.75rem] font-normal text-muted">
                        pagó la cancha
                      </span>
                    ) : null}
                  </p>
                </div>
                <AttendanceBadge status={status} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="animate-rise mt-8">
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Cancha
        </h2>
        <div className="rounded-2xl bg-sand px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[0.9rem] text-muted">Total</span>
            <span className="text-[1.35rem] font-semibold tracking-[-0.02em] tabular-nums">
              {formatSoles(session.costAmount)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-ink/6 pt-3">
            <span className="text-[0.9rem] text-muted">
              Por persona ({going.length})
            </span>
            <span className="text-[1.05rem] font-medium tabular-nums">
              {going.length ? formatSoles(share) : "—"}
            </span>
          </div>
          <p className="mt-3 text-[0.85rem] text-muted">
            Pagó {financier.displayName}
          </p>
        </div>

        {sessionDebts.length > 0 ? (
          <ul className="mt-2 overflow-hidden rounded-2xl bg-sand">
            {sessionDebts.map((d) => {
              const from = allPlayers.find((p) => p.id === d.fromPlayerId);
              const to = allPlayers.find((p) => p.id === d.toPlayerId);
              return (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 border-b border-ink/6 px-4 py-3 text-[0.9rem] last:border-b-0"
                >
                  <span className="text-muted">
                    <span className="font-medium text-ink">
                      {from?.displayName ?? "?"}
                    </span>
                    {" → "}
                    {to?.displayName ?? "?"}
                  </span>
                  <span className="font-medium tabular-nums text-ink">
                    {formatSoles(d.amount)}
                    {d.status === "settled" ? (
                      <span className="ml-2 text-[0.75rem] text-ok">pagado</span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-[0.9rem] text-muted">
            Todavía no hay deudas — faltan confirmaciones.
          </p>
        )}
      </section>

      <section className="animate-rise mt-8">
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Matches
        </h2>
        {sessionMatches.length === 0 ? (
          <p className="mb-4 text-[0.9rem] text-muted">Sin resultados todavía.</p>
        ) : (
          <ul className="mb-4 overflow-hidden rounded-2xl bg-sand">
            {sessionMatches.map((m) => {
              const a = m.sideA
                .map(
                  (pid) =>
                    allPlayers.find((p) => p.id === pid)?.displayName ?? "?",
                )
                .join(" / ");
              const b = m.sideB
                .map(
                  (pid) =>
                    allPlayers.find((p) => p.id === pid)?.displayName ?? "?",
                )
                .join(" / ");
              return (
                <li
                  key={m.id}
                  className="border-b border-ink/6 px-4 py-3 last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.75rem] font-medium capitalize text-muted">
                      {m.format}
                    </span>
                    <span className="text-[0.9rem] font-medium tabular-nums text-ink">
                      {m.score}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.95rem]">
                    <span
                      className={
                        m.winnerSide === "A" ? "font-medium text-ink" : "text-muted"
                      }
                    >
                      {a}
                    </span>
                    <span className="mx-2 text-muted">vs</span>
                    <span
                      className={
                        m.winnerSide === "B" ? "font-medium text-ink" : "text-muted"
                      }
                    >
                      {b}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}

        {canAddMatch ? (
          <form
            action={addMatchAction}
            className="space-y-3 rounded-2xl bg-sand px-4 py-4"
          >
            <p className="text-[0.9rem] font-medium text-ink">Agregar match</p>
            <p className="text-[0.8rem] text-muted">
              Elegí formato, jugadores, score (ej. 6-4, 6-3) y quién ganó.
            </p>
            <input type="hidden" name="playSessionId" value={session.id} />
            <label className="block text-[0.8rem] text-muted">
              Formato
              <select
                name="format"
                className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
                defaultValue="singles"
              >
                <option value="singles">Singles</option>
                <option value="doubles">Dobles</option>
              </select>
            </label>
            <label className="block text-[0.8rem] text-muted">
              Lado A
              <select
                name="sideA"
                className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
                required
              >
                {matchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[0.8rem] text-muted">
              Lado B
              <select
                name="sideB"
                className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
                required
              >
                {matchPlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[0.8rem] text-muted">
              Score
              <input
                name="score"
                placeholder="6-4, 6-3"
                required
                className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink placeholder:text-muted"
              />
            </label>
            <label className="block text-[0.8rem] text-muted">
              Ganador
              <select
                name="winnerSide"
                className="mt-1 w-full rounded-xl bg-mist-2 px-3 py-2.5 text-ink"
                defaultValue="A"
              >
                <option value="A">Lado A</option>
                <option value="B">Lado B</option>
              </select>
            </label>
            <PendingSubmitButton
              pendingLabel="Guardando…"
              className="w-full rounded-xl bg-ball py-3 text-[0.95rem] font-semibold text-on-ball"
            >
              Guardar match
            </PendingSubmitButton>
          </form>
        ) : (
          <p className="rounded-2xl bg-sand px-4 py-4 text-[0.9rem] text-muted">
            Para cargar un game hacen falta al menos{" "}
            <strong className="font-medium text-ink">2 jugadores</strong> en
            rally. Dile a un amigo que entre y marque “Voy”.
          </p>
        )}
      </section>

      {(sessionAuth?.user?.id === session.createdById ||
        sessionAuth?.user?.id === session.financierId) && (
        <DeleteSessionButton playSessionId={session.id} />
      )}
    </AppShell>
  );
}
