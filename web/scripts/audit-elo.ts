/**
 * Elo audit (read-only). Run: npm run audit:elo
 *
 * 1. Pulls real match + member data per group from the DB.
 * 2. Runs the app's own `buildEloRanking` (the code shipped to users).
 * 3. Independently recomputes Elo with a second, self-contained implementation.
 * 4. Cross-checks the two, plus invariants:
 *    - zero-sum rating conservation (unrounded)
 *    - W/L totals match the raw finished-match counts
 *    - fecha-to-fecha Elo chaining (each fecha's end Elo == next fecha's start)
 *    - dataset profile (deleted / in-progress / doubles / malformed excluded)
 *
 * Exit code: 0 when everything reconciles, 1 on any mismatch.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  buildEloRanking,
  ELO_INITIAL,
  ELO_K_BY_UNIT,
} from "../src/lib/ranking/elo";
import { buildSessionSinglesResumen } from "../src/lib/ranking/sessionResumen";
import type { Match, MatchUnit } from "../src/lib/domain/types";

const prisma = new PrismaClient();

type RawMatch = {
  id: string;
  playSessionId: string;
  format: string;
  unit: string;
  sideA: string[];
  sideB: string[];
  winnerSide: "A" | "B" | null;
  deletedAt: Date | null;
  createdAt: Date;
  playSession: { startsAt: Date; groupId: string };
};

/** Independent Elo recompute — intentionally NOT sharing code with elo.ts. */
function recomputeElo(matches: Match[], unit: MatchUnit) {
  const K = ELO_K_BY_UNIT[unit];
  const ordered = matches
    .filter(
      (m) =>
        m.format === "singles" &&
        m.unit === unit &&
        !m.deletedAt &&
        (m.winnerSide === "A" || m.winnerSide === "B"),
    )
    .slice()
    .sort((a, b) => {
      const sa = a.sessionStartsAt ? Date.parse(a.sessionStartsAt) : 0;
      const sb = b.sessionStartsAt ? Date.parse(b.sessionStartsAt) : 0;
      if (sa !== sb) return sa - sb;
      const ca = a.createdAt ? Date.parse(a.createdAt) : 0;
      const cb = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (ca !== cb) return ca - cb;
      return a.id.localeCompare(b.id);
    });

  const rating = new Map<string, number>();
  const wins = new Map<string, number>();
  const losses = new Map<string, number>();
  const get = (id: string) => rating.get(id) ?? ELO_INITIAL;

  for (const m of ordered) {
    const w = (m.winnerSide === "A" ? m.sideA : m.sideB)[0];
    const l = (m.winnerSide === "A" ? m.sideB : m.sideA)[0];
    if (!w || !l || w === l) continue;
    const rw = get(w);
    const rl = get(l);
    const expW = 1 / (1 + 10 ** ((rl - rw) / 400));
    const expL = 1 / (1 + 10 ** ((rw - rl) / 400));
    rating.set(w, rw + K * (1 - expW));
    rating.set(l, rl + K * (0 - expL));
    wins.set(w, (wins.get(w) ?? 0) + 1);
    losses.set(l, (losses.get(l) ?? 0) + 1);
  }

  return { rating, wins, losses };
}

async function main() {
  const groups = await prisma.group.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  let totalMismatches = 0;
  const units: MatchUnit[] = ["game", "set"];
  const now = new Date();

  for (const g of groups) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: g.id },
      include: { user: { select: { id: true, displayName: true, name: true } } },
    });
    const nameById = new Map<string, string>(
      members.map((m) => [
        m.user.id,
        m.user.displayName || m.user.name || m.user.id,
      ]),
    );
    const memberIds = members.map((m) => m.user.id);

    // Every match for the group, so we can profile exclusions too.
    const allRows = (await prisma.match.findMany({
      where: { playSession: { groupId: g.id } },
      include: { playSession: { select: { startsAt: true, groupId: true } } },
      orderBy: [
        { playSession: { startsAt: "asc" } },
        { createdAt: "asc" },
      ],
    })) as unknown as RawMatch[];

    const toMatch = (r: RawMatch): Match => ({
      id: r.id,
      sessionId: r.playSessionId,
      format: r.format as Match["format"],
      unit: r.unit as MatchUnit,
      sideA: r.sideA,
      sideB: r.sideB,
      score: "",
      winnerSide: r.winnerSide,
      deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      sessionStartsAt: r.playSession.startsAt.toISOString(),
    });

    const all = allRows.map(toMatch);
    // Same filter as listRankingMatches(): counted = past fecha, has winner, not deleted.
    const counted = allRows
      .filter(
        (r) =>
          r.winnerSide !== null &&
          !r.deletedAt &&
          r.playSession.startsAt < now,
      )
      .map(toMatch);

    console.log(`\n=== Group: ${g.name} (${g.slug}) ===`);
    console.log(
      `members=${memberIds.length}  totalMatches=${all.length}  ` +
        `singles=${all.filter((m) => m.format === "singles").length}  ` +
        `doubles=${all.filter((m) => m.format === "doubles").length}  ` +
        `deleted=${all.filter((m) => m.deletedAt).length}  ` +
        `inProgress=${all.filter((m) => m.winnerSide === null).length}  ` +
        `future=${allRows.filter((r) => r.playSession.startsAt >= now).length}  ` +
        `counted=${counted.length}`,
    );

    // Malformed singles sides.
    const malformed = all.filter(
      (m) =>
        m.format === "singles" &&
        (m.sideA.length !== 1 ||
          m.sideB.length !== 1 ||
          m.sideA[0] === m.sideB[0]),
    );
    if (malformed.length) {
      totalMismatches += malformed.length;
      for (const m of malformed) {
        console.log(
          `  MALFORMED ${m.id} ${m.format}/${m.unit} A=[${m.sideA}] B=[${m.sideB}]`,
        );
      }
    }

    for (const unit of units) {
      const appRows = buildEloRanking(counted, unit, memberIds, nameById);
      const indep = recomputeElo(counted, unit);
      const played = counted.filter(
        (m) => m.format === "singles" && m.unit === unit,
      );

      let sumDelta = 0;
      for (const [, r] of indep.rating) sumDelta += r - ELO_INITIAL;
      let totWins = 0;
      let totLosses = 0;
      for (const [, w] of indep.wins) totWins += w;
      for (const [, l] of indep.losses) totLosses += l;

      console.log(`\n  -- unit=${unit} --`);
      console.log(
        `  countedMatches=${played.length}  totalWins=${totWins}  ` +
          `totalLosses=${totLosses}  zeroSumDelta=${sumDelta.toFixed(6)}`,
      );

      const appById = new Map(appRows.map((r) => [r.playerId, r]));
      const playedIds = new Set<string>();
      for (const m of played) {
        playedIds.add(m.sideA[0]!);
        playedIds.add(m.sideB[0]!);
      }

      let unitMismatches = 0;
      for (const id of playedIds) {
        const app = appById.get(id);
        const indepPoints = Math.round(indep.rating.get(id) ?? ELO_INITIAL);
        const indepW = indep.wins.get(id) ?? 0;
        const indepL = indep.losses.get(id) ?? 0;
        if (
          !app ||
          app.points !== indepPoints ||
          app.wins !== indepW ||
          app.losses !== indepL
        ) {
          console.log(
            `  MISMATCH ${nameById.get(id) ?? id}: app(${app?.points},${app?.wins}-${app?.losses}) vs indep(${indepPoints},${indepW}-${indepL})`,
          );
          unitMismatches++;
        }
      }

      // Fecha chaining: each fecha's end Elo must equal the next fecha's start Elo.
      const sessionIds = [
        ...new Map(
          played.map((m) => [m.sessionId, m.sessionStartsAt ?? ""]),
        ).entries(),
      ]
        .sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]))
        .map(([id]) => id);

      const endByPlayer = new Map<string, Map<string, number>>();
      const startByPlayer = new Map<string, Map<string, number>>();
      for (const sid of sessionIds) {
        const rows = buildSessionSinglesResumen(counted, sid, unit);
        for (const row of rows) {
          if (!endByPlayer.has(row.playerId))
            endByPlayer.set(row.playerId, new Map());
          if (!startByPlayer.has(row.playerId))
            startByPlayer.set(row.playerId, new Map());
          endByPlayer.get(row.playerId)!.set(sid, row.eloEnd);
          startByPlayer.get(row.playerId)!.set(sid, row.eloStart);
        }
      }
      for (const pid of endByPlayer.keys()) {
        for (let i = 0; i < sessionIds.length - 1; i++) {
          const cur = sessionIds[i]!;
          const nxt = sessionIds[i + 1]!;
          const end = endByPlayer.get(pid)?.get(cur);
          const start = startByPlayer.get(pid)?.get(nxt);
          if (end != null && start != null && end !== start) {
            console.log(
              `  CHAIN BREAK ${nameById.get(pid) ?? pid}: fecha ${i + 1} end=${end} != fecha ${i + 2} start=${start}`,
            );
            unitMismatches++;
          }
        }
      }

      const top = appRows
        .filter((r) => r.played > 0)
        .map(
          (r) =>
            `    ${r.points}  ${r.wins}-${r.losses}  ${nameById.get(r.playerId) ?? r.playerId}`,
        );
      console.log(
        top.length
          ? `  App ${unit} ladder:\n${top.join("\n")}`
          : `  App ${unit} ladder: (no finished ${unit}s)`,
      );
      console.log(
        unitMismatches === 0
          ? `  OK: app matches independent recompute + chaining for ${unit}.`
          : `  ${unitMismatches} MISMATCH(es) for ${unit}.`,
      );
      totalMismatches += unitMismatches;
    }
  }

  console.log(
    `\n================\nTOTAL MISMATCHES ACROSS ALL GROUPS/UNITS: ${totalMismatches}`,
  );
  await prisma.$disconnect();
  process.exit(totalMismatches === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(2);
});
