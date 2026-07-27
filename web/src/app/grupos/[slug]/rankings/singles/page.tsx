import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { SinglesUnitTabs } from "@/components/SinglesUnitTabs";
import { listGroupPlayers, listRankingMatches } from "@/lib/data/queries";
import type { MatchUnit } from "@/lib/domain/types";
import { requireGroupMember } from "@/lib/groups";
import { buildRanking } from "@/lib/ranking/simple";

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
  const rows = buildRanking(matches, "singles", unit);
  const playersById = new Map(players.map((p) => [p.id, p]));
  const pointsLabel = unit === "game" ? "1 pt por victoria" : "3 pts por victoria";

  return (
    <>
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Singles
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Solo cuentan resultados de fechas ya pasadas. {pointsLabel}. Los games
          internos de un set no suman aparte.
        </p>
      </section>
      <RankingTabs slug={slug} active="singles" />
      <SinglesUnitTabs slug={slug} active={unit} />
      <RankingList
        rows={rows}
        playersById={playersById}
        emptyHint={
          unit === "game"
            ? "Todavía no hay games sueltos de fechas pasadas."
            : "Todavía no hay sets de fechas pasadas."
        }
      />
    </>
  );
}
