import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { SinglesUnitTabs } from "@/components/SinglesUnitTabs";
import { listGroupPlayers, listRankingMatches } from "@/lib/data/queries";
import type { MatchUnit } from "@/lib/domain/types";
import { requireGroupMember } from "@/lib/groups";
import { buildEloRanking } from "@/lib/ranking/elo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking singles" };

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
          Singles
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Ranking Elo (parten en 1000). Sin resultados aún, ves a todos los
          miembros; después solo quienes ya jugaron. Games y Sets son ladders
          separados. Solo cuentan fechas ya pasadas.
        </p>
      </section>
      <RankingTabs slug={slug} active="singles" />
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
