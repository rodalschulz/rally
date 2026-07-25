import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { listGroupPlayers, listRankingMatches } from "@/lib/data/queries";
import { requireGroupMember } from "@/lib/groups";
import { buildRanking } from "@/lib/ranking/simple";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking singles" };

export default async function SinglesRankingPage({
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
  const rows = buildRanking(matches, "singles");
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Singles
        </h1>
        <p className="mt-1 text-[0.85rem] text-muted">
          Solo cuentan games de fechas ya pasadas.
        </p>
      </section>
      <RankingTabs slug={slug} active="singles" />
      <RankingList
        rows={rows}
        playersById={playersById}
        emptyHint="Todavía no hay partidos singles de fechas pasadas."
      />
    </>
  );
}
