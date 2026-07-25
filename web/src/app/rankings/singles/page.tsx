import { AppShell } from "@/components/AppShell";
import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { listMatches, listPlayers } from "@/lib/data/queries";
import { buildRanking } from "@/lib/ranking/simple";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ranking singles" };

export default async function SinglesRankingPage() {
  const [matches, players] = await Promise.all([listMatches(), listPlayers()]);
  const rows = buildRanking(matches, "singles");
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <AppShell title="Rankings" subtitle="Singles">
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Singles
        </h1>
      </section>
      <RankingTabs active="singles" />
      <RankingList
        rows={rows}
        playersById={playersById}
        emptyHint="Todavía no hay partidos singles."
      />
    </AppShell>
  );
}
