import { RankingList } from "@/components/RankingList";
import { SinglesUnitTabs } from "@/components/SinglesUnitTabs";
import { listGroupPlayers, listRankingMatches } from "@/lib/data/queries";
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

  const [matches, players] = await Promise.all([
    listRankingMatches(group.id),
    listGroupPlayers(group.id),
  ]);
  const playersById = new Map(players.map((p) => [p.id, p]));
  const displayNameById = new Map(
    players.map((p) => [p.id, p.displayName] as const),
  );
  const rows = buildEloRanking(
    matches,
    unit,
    players.map((p) => p.id),
    displayNameById,
  );

  return (
    <>
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Ranking
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Ranking Elo (inicia en 1000). Games y Sets son rankings
          separados.
        </p>
      </section>
      <SinglesUnitTabs slug={slug} active={unit} />
      <RankingList
        rows={rows}
        playersById={playersById}
        scoreLabel="Elo"
        playedLabel={unit === "game" ? "Games" : "Sets"}
        emptyHint="Todavía no hay miembros en este grupo."
      />
    </>
  );
}
