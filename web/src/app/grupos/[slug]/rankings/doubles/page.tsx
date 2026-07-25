import { AppShell } from "@/components/AppShell";
import { RankingList } from "@/components/RankingList";
import { RankingTabs } from "@/components/RankingTabs";
import { listGroupPlayers, listMatches } from "@/lib/data/queries";
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
    listMatches(group.id),
    listGroupPlayers(group.id),
  ]);
  const rows = buildRanking(matches, "doubles");
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <AppShell
      groupSlug={slug}
      groupName={group.name}
      title="Rankings"
      subtitle="Dobles"
    >
      <section className="animate-rise mb-5">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Dobles
        </h1>
      </section>
      <RankingTabs slug={slug} active="doubles" />
      <RankingList
        rows={rows}
        playersById={playersById}
        emptyHint="Todavía no hay partidos de dobles."
      />
    </AppShell>
  );
}
