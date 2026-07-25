import Link from "next/link";
import { redirect } from "next/navigation";
import { FreshOnMount } from "@/components/FreshOnMount";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { SessionAttendanceBlock } from "@/components/SessionAttendanceBlock";
import { SessionChat } from "@/components/SessionChat";
import { SinglesGamesPanel } from "@/components/SinglesGamesPanel";
import { getSession } from "@/lib/auth-session";
import {
  getPlaySession,
  listGroupPlayers,
  listSessionChatMessages,
  toAttendance,
  toDebt,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/data/queries";
import { roundMoney } from "@/lib/domain/split";
import { formatSessionWhen, formatSoles } from "@/lib/format";
import { requireGroupMember } from "@/lib/groups";
import {
  canPostSessionChat,
  isSessionChatOpen,
} from "@/lib/sessions/chat";
import { canDeletePlaySession } from "@/lib/sessions/permissions";
import { isSessionGamesOpen } from "@/lib/sessions/windows";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  if (id === "nueva") redirect(`/grupos/${slug}/sessions/nueva`);

  const group = await requireGroupMember(slug);
  const userId = group.membership.userId;
  const authSession = await getSession();

  const [row, allPlayers, chatMessages] = await Promise.all([
    getPlaySession(id, group.id),
    listGroupPlayers(group.id),
    listSessionChatMessages(id),
  ]);
  if (!row) redirect("/");

  const session = toSession(row);
  const when = formatSessionWhen(session.startsAt);
  const sessionAtt = row.attendances.map(toAttendance);
  const financier = toPlayer(row.financier);
  const memberIds = new Set(allPlayers.map((p) => p.id));
  const going = sessionAtt.filter(
    (a) => a.status === "going" && memberIds.has(a.playerId),
  );
  const share =
    going.length > 0 ? roundMoney(session.costAmount / going.length) : 0;
  const sessionDebts = row.debts.map(toDebt);
  const sessionMatches = row.matches.map(toMatch);
  const goingPlayers = allPlayers.filter((p) =>
    going.some((a) => a.playerId === p.id),
  );
  const singlesGames = sessionMatches.filter((m) => m.format === "singles");
  const attendanceSyncKey = sessionAtt
    .map((a) => `${a.playerId}:${a.status}`)
    .sort()
    .join("|");
  const startsAtDate = new Date(session.startsAt);
  const gamesOpen = isSessionGamesOpen(startsAtDate);
  const canManageGames =
    gamesOpen && going.some((a) => a.playerId === userId);
  const myAtt = sessionAtt.find((a) => a.playerId === userId)?.status;
  const chatOpen = isSessionChatOpen(startsAtDate);
  const chatCanPost = chatOpen && canPostSessionChat(myAtt);
  const mePlayer = allPlayers.find((p) => p.id === userId);

  return (
    <>
      <FreshOnMount />
      {userId === session.createdById ? (
        <div className="mb-5 flex justify-end">
          <Link
            href={`/grupos/${slug}/sessions/${session.id}/editar`}
            className="text-[0.9rem] font-medium text-ink"
          >
            Editar
          </Link>
        </div>
      ) : null}

      <section className="animate-rise">
        <p className="text-[0.8rem] font-medium text-muted">
          {session.courtLabel ?? "Cancha"}
        </p>
        <h1 className="mt-1 text-[2rem] font-semibold tracking-[-0.03em] text-ink">
          {when.time}
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">{when.label}</p>
        {(session.maxAttendees != null ||
          session.allowedUserIds.length > 0) && (
          <p className="mt-2 text-[0.85rem] text-muted">
            {session.maxAttendees != null
              ? `Cupo ${going.length}/${session.maxAttendees}`
              : null}
            {session.maxAttendees != null &&
            session.allowedUserIds.length > 0
              ? " · "
              : null}
            {session.allowedUserIds.length > 0 ? "Solo invitados" : null}
          </p>
        )}
        {session.note ? (
          <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">
            {session.note}
          </p>
        ) : null}
      </section>

      <SessionAttendanceBlock
        playSessionId={session.id}
        meId={userId}
        players={allPlayers}
        financierId={session.financierId}
        initialAttendances={sessionAtt.map((a) => ({
          playerId: a.playerId,
          status: a.status,
        }))}
        syncKey={attendanceSyncKey}
        maxAttendees={session.maxAttendees}
        allowedUserIds={session.allowedUserIds}
      />

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
              {session.financierCoversAll
                ? "Por persona"
                : `Por persona (${going.length})`}
            </span>
            <span className="text-[1.05rem] font-medium tabular-nums">
              {session.financierCoversAll
                ? formatSoles(0)
                : going.length
                  ? formatSoles(share)
                  : "—"}
            </span>
          </div>
          <p className="mt-3 text-[0.85rem] text-muted">
            Pagó {financier.displayName}
            {session.financierCoversAll ? " · cancha regalada" : ""}
          </p>
        </div>

        {session.financierCoversAll ? (
          <p className="mt-3 text-[0.9rem] text-muted">
            Cancha regalada — no hay deudas en esta fecha.
          </p>
        ) : sessionDebts.length > 0 ? (
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

      <SinglesGamesPanel
        playSessionId={session.id}
        players={goingPlayers}
        labelPlayers={allPlayers}
        games={singlesGames}
        canManage={canManageGames}
        gamesOpen={gamesOpen}
      />

      <SessionChat
        playSessionId={session.id}
        initialMessages={chatMessages}
        canPost={chatCanPost}
        chatOpen={chatOpen}
        meId={userId}
        meDisplayName={
          mePlayer?.displayName ??
          authSession?.user?.displayName ??
          "Jugador"
        }
        meShortName={
          mePlayer?.shortName ?? authSession?.user?.shortName ?? "J"
        }
        meHue={mePlayer?.hue ?? authSession?.user?.hue ?? 160}
      />

      {canDeletePlaySession(
        {
          createdById: session.createdById,
          financierId: session.financierId,
          startsAt: new Date(session.startsAt),
        },
        userId,
      ) ? (
        <DeleteSessionButton playSessionId={session.id} />
      ) : null}
    </>
  );
}
