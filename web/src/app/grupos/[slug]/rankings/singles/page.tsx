import { RankingWithPlayerStats } from "@/components/RankingWithPlayerStats";
import { SinglesUnitTabs } from "@/components/SinglesUnitTabs";
import {
  listGroupMembers,
  listPlaySessions,
  listRankingMatches,
  toAttendance,
  toSession,
} from "@/lib/data/queries";
import type { MatchUnit } from "@/lib/domain/types";
import { requireGroupMember } from "@/lib/groups";
import { buildEloRanking } from "@/lib/ranking/elo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking" };

function resolveUnit(raw: string | string[] | undefined): MatchUnit {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "set" ? "set" : "game";
}

export default async function SinglesRankingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ unit?: string | string[] }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const unit = resolveUnit(sp.unit);
  const group = await requireGroupMember(slug);

  const [matches, members, sessionRows] = await Promise.all([
    listRankingMatches(group.id),
    listGroupMembers(group.id),
    listPlaySessions(group.id),
  ]);
  const players = members.map((m) => m.player);
  const memberIds = players.map((p) => p.id);
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
  const joinedAtById = Object.fromEntries(
    members.map((m) => [m.player.id, m.joinedAt]),
  );
  const displayNameById = new Map(
    players.map((p) => [p.id, p.displayName] as const),
  );
  const rows = buildEloRanking(matches, unit, memberIds, displayNameById);

  const sessions = sessionRows.map((row) => {
    const s = toSession(row);
    return {
      id: s.id,
      startsAt: s.startsAt,
      status: s.status,
      allowedUserIds: s.allowedUserIds,
    };
  });
  const attendances = sessionRows.flatMap((row) =>
    row.attendances.map(toAttendance),
  );

  return (
    <>
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Ranking
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          El ranking Elo inicia en 1000. Games y Sets son rankings
          separados. Toca un jugador para ver sus estadísticas.
        </p>
      </section>
      <SinglesUnitTabs slug={slug} active={unit} />
      <RankingWithPlayerStats
        rows={rows}
        playersById={playersById}
        matches={matches}
        memberIds={memberIds}
        joinedAtById={joinedAtById}
        sessions={sessions}
        attendances={attendances}
        unit={unit}
        scoreLabel="Elo"
        playedLabel={unit === "game" ? "Games" : "Sets"}
        emptyHint="Todavía no hay miembros en este grupo."
      />
    </>
  );
}
