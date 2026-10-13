import { SinglesResultsPanel } from "@/components/SinglesResultsPanel";
import {
  listRankingMatches,
  listSessionMatchChangeLogs,
} from "@/lib/data/queries";
import type { Match, Player } from "@/lib/domain/types";

/**
 * Elo history for one fecha. Streamed after the fecha shell so opening a
 * date does not wait on every ranking match in the group.
 */
export async function SessionResultsSection({
  groupId,
  throughStartsAt,
  playSessionId,
  players,
  labelPlayers,
  results,
  canManage,
  gamesOpen,
}: {
  groupId: string;
  throughStartsAt: Date;
  playSessionId: string;
  players: Player[];
  labelPlayers: Player[];
  results: Match[];
  canManage: boolean;
  gamesOpen: boolean;
}) {
  const [rankingMatches, changeLog] = await Promise.all([
    listRankingMatches(groupId, { throughStartsAt }),
    listSessionMatchChangeLogs(playSessionId),
  ]);

  return (
    <SinglesResultsPanel
      playSessionId={playSessionId}
      players={players}
      labelPlayers={labelPlayers}
      results={results}
      rankingMatches={rankingMatches}
      changeLog={changeLog}
      canManage={canManage}
      gamesOpen={gamesOpen}
    />
  );
}
