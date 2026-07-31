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
  return value === "game" ? "game" : "set";
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
  const rows = buildEloRanking(matches, unit);
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Singles
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Ranking Elo (parte en 1000). Games y Sets son ladders separados: un
          set no suma como games. Solo cuentan resultados de fechas ya pasadas.
        </p>
      </section>
      <RankingTabs slug={slug} active="singles" />
      <SinglesUnitTabs slug={slug} active={unit} />
      <RankingList
        rows={rows}
        playersById={playersById}
        scoreLabel="Elo"
        emptyHint={
          unit === "game"
            ? "Todavía no hay games sueltos de fechas pasadas."
            : "Todavía no hay sets de fechas pasadas."
        }
      />
    </>
  );
}
