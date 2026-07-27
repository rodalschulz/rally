import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { listGroupPlayers, listRankingMatches } from "@/lib/data/queries";
import { requireGroupMember } from "@/lib/groups";
import { buildRanking } from "@/lib/ranking/simple";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking dobles" };

export default async function DoublesRankingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);

  const [matches, players] = await Promise.all([
    listRankingMatches(group.id),
    listGroupPlayers(group.id),
  ]);
  const rows = buildRanking(matches, "doubles", "set");
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Dobles
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Solo cuentan sets de fechas ya pasadas (3 pts por victoria).
        </p>
      </section>
      <RankingTabs slug={slug} active="doubles" />
      <RankingList
        rows={rows}
        playersById={playersById}
        emptyHint="Todavía no hay sets de dobles de fechas pasadas."
      />
    </>
  );
}
