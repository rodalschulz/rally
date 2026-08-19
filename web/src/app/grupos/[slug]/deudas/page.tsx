import { OpenDebtsSections } from "@/components/OpenDebtsSections";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SettledDebtsHistory } from "@/components/SettledDebtsHistory";
import { listGroupPlayers, listOpenDebts, listSettledDebts } from "@/lib/data/queries";
import { SETTLED_DEBTS_PREVIEW_LIMIT } from "@/lib/debts/history";
import { userIsAppAdmin } from "@/lib/admin";
import { netBalances } from "@/lib/domain/split";
import { formatSoles } from "@/lib/format";
import { requireGroupMember } from "@/lib/groups";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deudas" };

export default async function DebtsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await requireGroupMember(slug);
  const me = group.membership.userId;

  const [open, settledRows, players, isAppAdmin] = await Promise.all([
    listOpenDebts(group.id),
    listSettledDebts(group.id, { take: SETTLED_DEBTS_PREVIEW_LIMIT + 1 }),
    listGroupPlayers(group.id),
    userIsAppAdmin(me),
  ]);
  const balances = netBalances(
    open,
    players.map((p) => p.id),
  );
  const hasMoreSettled = settledRows.length > SETTLED_DEBTS_PREVIEW_LIMIT;
  const settledPreview = settledRows.slice(0, SETTLED_DEBTS_PREVIEW_LIMIT);
  const owedToMe = open.filter((d) => d.toPlayerId === me);
  const iOwe = open.filter((d) => d.fromPlayerId === me);
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Deudas
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Cada deuda pertenece a una fecha. Paga por Yape/Plin y avisa; solo el
          acreedor salda cuando confirmó el cobro (fecha ya pasada).
        </p>
      </section>

      <section className="animate-rise mb-6 grid grid-cols-2 gap-3">
        <Stat
          label="Te deben"
          value={formatSoles(owedToMe.reduce((s, d) => s + d.amount, 0))}
          tone="good"
        />
        <Stat
          label="Debes"
          value={formatSoles(iOwe.reduce((s, d) => s + d.amount, 0))}
          tone="warn"
        />
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Saldos
        </h2>
        <ul className="overflow-hidden rounded-2xl bg-sand">
          {players.length === 0 ? (
            <li className="px-4 py-8 text-center text-[0.9rem] text-muted">
              Todavía no hay jugadores.
            </li>
          ) : (
            players.map((p, i) => {
              const net = balances.get(p.id) ?? 0;
              return (
                <li
                  key={p.id}
                  className="animate-row flex items-center gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <PlayerAvatar player={p} size="sm" />
                  <span className="flex-1 font-medium text-ink">
                    {p.displayName}
                    {p.id === me ? (
                      <span className="ml-1.5 text-[0.8rem] font-normal text-muted">
                        (tú)
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={`font-medium tabular-nums ${
                      net > 0 ? "text-ok" : net < 0 ? "text-danger" : "text-muted"
                    }`}
                  >
                    {net > 0 ? "+" : ""}
                    {formatSoles(net)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section className="mb-2">
        <div className="mb-4 flex items-start justify-between gap-2">
          <p className="text-[0.85rem] leading-snug text-muted">
            Solo quien recibe (o un admin) puede
            Saldar cuando la fecha ya pasó.
          </p>
        </div>
        <OpenDebtsSections
          slug={slug}
          me={me}
          isAppAdmin={isAppAdmin}
          open={open}
          playersById={playersById}
        />
      </section>

      <SettledDebtsHistory
        slug={slug}
        preview={settledPreview}
        hasMore={hasMoreSettled}
        players={players}
      />
    </>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  return (
    <div className="rounded-2xl bg-sand px-4 py-4">
      <p className="text-[0.8rem] text-muted">{label}</p>
      <p
        className={`mt-1 text-[1.35rem] font-semibold tracking-[-0.02em] tabular-nums ${
          tone === "good" ? "text-ok" : "text-danger"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
