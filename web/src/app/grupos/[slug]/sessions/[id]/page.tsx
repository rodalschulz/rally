import Link from "next/link";
import { notFound } from "next/navigation";
import { AttendanceBadge, RsvpStrip } from "@/components/AttendanceUi";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  getPlaySession,
  listGroupPlayers,
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/data/queries";
import { roundMoney } from "@/lib/domain/split";
import { formatSessionWhen, formatSoles } from "@/lib/format";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { SinglesGamesForm } from "@/components/SinglesGamesForm";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (id === "nueva") notFound();

  const group = await requireGroupMember(slug);
  const userId = group.membership.userId;

  const [row, allPlayers] = await Promise.all([
    getPlaySession(id, group.id),
    listGroupPlayers(group.id),
  ]);
  if (!row) notFound();

  const session = toSession(row);
  const when = formatSessionWhen(session.startsAt);
  const sessionAtt = row.attendances.map(toAttendance);
  const attByUser = new Map(sessionAtt.map((a) => [a.playerId, a.status]));
  const myAtt =
    sessionAtt.find((a) => a.playerId === userId)?.status ?? "pending";
  const financier = toPlayer(row.financier);
  const going = sessionAtt.filter((a) => a.status === "going");
  const share =
    going.length > 0 ? roundMoney(session.costAmount / going.length) : 0;
  const sessionDebts = row.debts.map(toDebt);
  const sessionMatches = row.matches.map(toMatch);
  const goingPlayers = allPlayers.filter((p) =>
    going.some((a) => a.playerId === p.id),
  );
  const singlesGames = sessionMatches.filter((m) => m.format === "singles");

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href={`/grupos/${slug}`}
          className="inline-flex text-[0.9rem] font-medium text-muted"
        >
          ← Fechas
        </Link>
        {userId === session.createdById ? (
          <Link
            href={`/grupos/${slug}/sessions/${session.id}/editar`}
            className="text-[0.9rem] font-medium text-ink"
          >
            Editar
          </Link>
        ) : null}
      </div>

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
            Jugadores
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
          Games (singles)
        </h2>
        {singlesGames.length === 0 ? (
          <p className="mb-4 text-[0.9rem] text-muted">Sin games todavía.</p>
        ) : (
          <ul className="mb-4 overflow-hidden rounded-2xl bg-sand">
            {singlesGames.map((m, i) => {
              const a =
                allPlayers.find((p) => p.id === m.sideA[0])?.displayName ?? "?";
              const b =
                allPlayers.find((p) => p.id === m.sideB[0])?.displayName ?? "?";
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
                >
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
                </li>
              );
            })}
          </ul>
        )}

        <SinglesGamesForm
          playSessionId={session.id}
          players={goingPlayers}
        />
      </section>

      {(userId === session.createdById || userId === session.financierId) && (
        <DeleteSessionButton playSessionId={session.id} />
      )}
    </>
  );
}
