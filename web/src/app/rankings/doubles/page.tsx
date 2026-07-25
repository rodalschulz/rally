import { AppShell } from "@/components/AppShell";
import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { listMatches, listPlayers } from "@/lib/data/queries";
import { buildRanking } from "@/lib/ranking/simple";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking dobles" };

export default async function DoublesRankingPage() {
  const [matches, players] = await Promise.all([listMatches(), listPlayers()]);
  const rows = buildRanking(matches, "doubles");
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <AppShell title="Rankings" subtitle="Dobles">
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Dobles
        </h1>
      </section>
      <RankingTabs active="doubles" />
      <RankingList
        rows={rows}
        playersById={playersById}
        emptyHint="Todavía no hay partidos de dobles."
      />
    </AppShell>
  );
}
