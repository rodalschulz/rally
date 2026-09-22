import Link from "next/link";
import { redirect } from "next/navigation";
import { FreshOnMount } from "@/components/FreshOnMount";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { SessionAttendanceBlock } from "@/components/SessionAttendanceBlock";
import { RecogeBolasBlock } from "@/components/RecogeBolasBlock";
import { SessionFinancierControl } from "@/components/SessionFinancierControl";
import { SinglesResultsPanel } from "@/components/SinglesResultsPanel";
import {
  getPlaySession,
  listGroupPlayers,
  listRankingMatches,
  listSessionMatchChangeLogs,
  toAttendance,
  toMatch,
  toPlayer,
  toSession,
} from "@/lib/data/queries";
import { roundMoney } from "@/lib/domain/split";
import { formatSessionWhen, formatSoles } from "@/lib/format";
import { requireGroupMember } from "@/lib/groups";
import {
  canChangeAttendance,
  canDeletePlaySession,
  canEditPlaySession,
} from "@/lib/sessions/permissions";
import { userIsAppAdmin } from "@/lib/admin";
import {
  canEditRecogeBolas,
  isRecogeBolasApplied,
} from "@/lib/sessions/recogeBolas";
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

  const [row, allPlayers, changeLog, rankingMatches, isAppAdmin] =
    await Promise.all([
      getPlaySession(id, group.id),
      listGroupPlayers(group.id),
      listSessionMatchChangeLogs(id),
      listRankingMatches(group.id),
      userIsAppAdmin(userId),
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
  const recogeApplied = isRecogeBolasApplied(session);
  const recogeShare =
    recogeApplied && going.length > 0
      ? roundMoney((session.recogeBolasAmount ?? 0) / going.length)
      : null;
  const actorIsGoing = going.some((a) => a.playerId === userId);
  const canEditRecoge = canEditRecogeBolas({
    applied: recogeApplied,
    actorIsGoing,
    isAppAdmin,
  });
  const recogePayer =
    row.recogeBolasPayer != null ? toPlayer(row.recogeBolasPayer) : null;
  const sessionMatches = row.matches.map(toMatch);
  const goingPlayers = allPlayers.filter((p) =>
    going.some((a) => a.playerId === p.id),
  );
  const singlesResults = sessionMatches.filter(
    (m) => m.format === "singles" && !m.deletedAt,
  );
  const attendanceSyncKey = sessionAtt
    .map((a) => `${a.playerId}:${a.status}`)
    .sort()
    .join("|");
  const startsAtDate = new Date(session.startsAt);
  const gamesOpen = isSessionGamesOpen(startsAtDate);
  const canManageGames =
    gamesOpen && going.some((a) => a.playerId === userId);
  const attendanceOpen = canChangeAttendance(startsAtDate);
  const canEdit = canEditPlaySession(
    { createdById: session.createdById, startsAt: startsAtDate },
    userId,
    { isAppAdmin },
  );
  const canDelete = canDeletePlaySession(
    {
      createdById: session.createdById,
      financierId: session.financierId,
      startsAt: startsAtDate,
    },
    userId,
    {
      isGroupOwner: group.membership.role === "owner",
      isAppAdmin,
    },
  );

  return (
    <>
      <FreshOnMount />
      <div className="mb-5 flex items-center justify-between gap-3">
        <SessionFinancierControl
          playSessionId={session.id}
          financier={{
            id: financier.id,
            displayName: financier.displayName,
          }}
          players={allPlayers.map((p) => ({
            id: p.id,
            displayName: p.displayName,
          }))}
          canReassign={isAppAdmin}
        />
        {canEdit ? (
          <Link
            href={`/grupos/${slug}/sessions/${session.id}/editar`}
            className="shrink-0 text-[0.9rem] font-medium text-ink"
          >
            Editar
          </Link>
        ) : null}
      </div>

      <section className="animate-rise">
        <p className="text-[0.8rem] font-medium text-muted">
          {session.courtLabel ?? "Cancha"}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-ink">
            {when.time}
          </h1>
          <p className="shrink-0 text-[1.35rem] font-semibold tracking-[-0.02em] tabular-nums text-ink">
            {formatSoles(session.costAmount)}
          </p>
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-[0.95rem] text-muted">{when.label}</p>
          <p className="shrink-0 text-right text-[0.85rem] tabular-nums text-muted">
            {session.financierCoversAll
              ? "Regalada"
              : going.length > 0
                ? `${formatSoles(share)} c/u`
                : "— c/u"}
            {recogeShare != null ? (
              <span className="mt-0.5 block">
                + {formatSoles(recogeShare)} recoge bolas
              </span>
            ) : null}
          </p>
        </div>
        {session.allowedUserIds.length > 0 ? (
          <p className="mt-2 text-[0.85rem] text-muted">Solo invitados</p>
        ) : null}
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
        recogeBolasPayerId={session.recogeBolasPayerId}
        initialAttendances={sessionAtt.map((a) => ({
          playerId: a.playerId,
          status: a.status,
        }))}
        syncKey={attendanceSyncKey}
        maxAttendees={session.maxAttendees}
        allowedUserIds={session.allowedUserIds}
        canChange={attendanceOpen}
        isAppAdmin={isAppAdmin}
      />

      <SinglesResultsPanel
        playSessionId={session.id}
        players={goingPlayers}
        labelPlayers={allPlayers}
        results={singlesResults}
        rankingMatches={rankingMatches}
        changeLog={changeLog}
        canManage={canManageGames}
        gamesOpen={gamesOpen}
      />

      <RecogeBolasBlock
        playSessionId={session.id}
        amount={session.recogeBolasAmount ?? null}
        payerId={session.recogeBolasPayerId ?? null}
        payerName={recogePayer?.displayName ?? null}
        goingPlayers={goingPlayers.map((p) => ({
          id: p.id,
          displayName: p.displayName,
        }))}
        canEdit={canEditRecoge}
        isAppAdmin={isAppAdmin}
        defaultPayerId={actorIsGoing ? userId : (goingPlayers[0]?.id ?? "")}
        share={recogeShare}
      />

      {canDelete ? (
        <DeleteSessionButton playSessionId={session.id} />
      ) : null}
    </>
  );
}
