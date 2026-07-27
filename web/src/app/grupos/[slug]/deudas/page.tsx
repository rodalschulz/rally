import Link from "next/link";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { listAllDebts, listGroupPlayers } from "@/lib/data/queries";
import { netBalances } from "@/lib/domain/split";
import { formatSessionChip, formatSessionWhen, formatSoles } from "@/lib/format";
import { settleDebtAction } from "@/lib/actions/sessions";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
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

  const [debts, players] = await Promise.all([
    listAllDebts(group.id),
    listGroupPlayers(group.id),
  ]);
  const balances = netBalances(
    debts,
    players.map((p) => p.id),
  );
  const open = debts.filter((d) => d.status === "open");
  const owedToMe = open.filter((d) => d.toPlayerId === me);
  const iOwe = open.filter((d) => d.fromPlayerId === me);
  const playersById = new Map(players.map((p) => [p.id, p]));

  return (
    <>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Deudas
        </h1>
        <p className="mt-1 max-w-[36ch] text-[0.95rem] text-muted">
          Cada deuda pertenece a una fecha. Positivo = te deben. Negativo =
          debes.
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

      <section>
        <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
          Abiertas
        </h2>
        {open.length === 0 ? (
          <p className="text-[0.95rem] text-muted">Nadie se debe nada.</p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-sand">
            {open.map((d) => {
              const from = playersById.get(d.fromPlayerId);
              const to = playersById.get(d.toPlayerId);
              const when = formatSessionWhen(d.sessionStartsAt);
              const fechaLabel = `${formatSessionChip(d.sessionStartsAt)} · ${when.time}`;
              return (
                <li
                  key={d.id}
                  className="border-b border-ink/6 px-4 py-3 text-[0.9rem] last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p>
                        <span className="font-medium text-ink">
                          {from?.displayName}
                        </span>
                        <span className="text-muted"> → {to?.displayName}</span>
                      </p>
                      <Link
                        href={`/grupos/${slug}/sessions/${d.sessionId}`}
                        className="mt-0.5 block truncate text-[0.8rem] text-muted hover:text-ink"
                      >
                        {fechaLabel}
                        {d.sessionCourtLabel
                          ? ` · ${d.sessionCourtLabel}`
                          : ""}
                      </Link>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-medium tabular-nums text-ink">
                        {formatSoles(d.amount)}
                      </span>
                      {(me === d.toPlayerId || me === d.fromPlayerId) && (
                        <form action={settleDebtAction}>
                          <input type="hidden" name="debtId" value={d.id} />
                          <PendingSubmitButton
                            pendingLabel="…"
                            className="text-[0.75rem] font-medium text-muted"
                          >
                            Saldar
                          </PendingSubmitButton>
                        </form>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
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
