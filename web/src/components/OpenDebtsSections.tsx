import Link from "next/link";
import type { ReactNode } from "react";
import { ClaimDebtPaidButton } from "@/components/ClaimDebtPaidButton";
import { PayDebtButton } from "@/components/PayDebtSheet";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SettleDebtButton } from "@/components/SettleDebtButton";
import { canSettleDebt } from "@/lib/debts/permissions";
import {
  groupDebtsByCounterparty,
  othersOpenDebts,
} from "@/lib/debts/groupOpenDebts";
import type { DebtWithSession, Player } from "@/lib/domain/types";
import { formatSessionChip, formatSessionWhen, formatSoles } from "@/lib/format";

export function OpenDebtsSections({
  slug,
  me,
  isAppAdmin,
  open,
  playersById,
}: {
  slug: string;
  me: string;
  isAppAdmin: boolean;
  open: DebtWithSession[];
  playersById: Map<string, Player>;
}) {
  const owedToMe = open.filter((d) => d.toPlayerId === me);
  const iOwe = open.filter((d) => d.fromPlayerId === me);
  const others = othersOpenDebts(open, me);
  const owedGroups = groupDebtsByCounterparty(owedToMe, "owed_to_me");
  const oweGroups = groupDebtsByCounterparty(iOwe, "i_owe");

  if (open.length === 0) {
    return <p className="text-[0.95rem] text-muted">Nadie se debe nada.</p>;
  }

  return (
    <div className="space-y-8">
      <DebtRoleSection
        title="Te deben"
        empty="Nadie te debe."
        groups={owedGroups}
        playersById={playersById}
        slug={slug}
        me={me}
        isAppAdmin={isAppAdmin}
        role="owed_to_me"
      />
      <DebtRoleSection
        title="Debes"
        empty="No debes nada."
        groups={oweGroups}
        playersById={playersById}
        slug={slug}
        me={me}
        isAppAdmin={isAppAdmin}
        role="i_owe"
      />
      {others.length > 0 ? (
        <section>
          <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
            Entre otros
          </h2>
          <ul className="overflow-hidden rounded-2xl bg-sand">
            {others.map((d) => {
              const from = playersById.get(d.fromPlayerId);
              const to = playersById.get(d.toPlayerId);
              return (
                <DebtRow
                  key={d.id}
                  debt={d}
                  slug={slug}
                  label={`${from?.displayName ?? "Alguien"} → ${to?.displayName ?? "Alguien"}`}
                  trailing={
                    canSettleDebt({
                      creditorId: d.toPlayerId,
                      userId: me,
                      sessionStartsAt: d.sessionStartsAt,
                      isAppAdmin,
                    }) ? (
                      <SettleDebtButton
                        debtId={d.id}
                        fromName={from?.displayName ?? "Alguien"}
                        toName={to?.displayName ?? "Alguien"}
                        amountLabel={formatSoles(d.amount)}
                      />
                    ) : null
                  }
                />
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function DebtRoleSection({
  title,
  empty,
  groups,
  playersById,
  slug,
  me,
  isAppAdmin,
  role,
}: {
  title: string;
  empty: string;
  groups: ReturnType<typeof groupDebtsByCounterparty>;
  playersById: Map<string, Player>;
  slug: string;
  me: string;
  isAppAdmin: boolean;
  role: "owed_to_me" | "i_owe";
}) {
  return (
    <section>
      <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {groups.length === 0 ? (
        <p className="text-[0.95rem] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const counterparty = playersById.get(g.counterpartyId);
            const name = counterparty?.displayName ?? "Alguien";
            const anyClaimed = g.debts.some((d) => d.paymentClaimedAt);
            return (
              <li
                key={g.counterpartyId}
                className="overflow-hidden rounded-2xl bg-sand"
              >
                <div className="flex items-center gap-3 border-b border-ink/6 px-4 py-3">
                  {counterparty ? (
                    <PlayerAvatar player={counterparty} size="sm" />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{name}</p>
                    <p className="text-[0.8rem] text-muted">
                      {g.debts.length === 1
                        ? "1 fecha"
                        : `${g.debts.length} fechas`}
                      {anyClaimed && role === "owed_to_me"
                        ? " · avisó que pagó"
                        : null}
                      {anyClaimed && role === "i_owe" ? " · avisaste" : null}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">
                    {formatSoles(g.total)}
                  </span>
                  {role === "i_owe" && counterparty ? (
                    <PayDebtButton
                      creditor={{
                        id: counterparty.id,
                        displayName: counterparty.displayName,
                        paymentPhone: counterparty.paymentPhone,
                        paymentWallet: counterparty.paymentWallet,
                      }}
                      debts={g.debts.map((d) => ({
                        id: d.id,
                        amount: d.amount,
                        sessionStartsAt: d.sessionStartsAt,
                        sessionCourtLabel: d.sessionCourtLabel,
                        paymentClaimedAt: d.paymentClaimedAt,
                      }))}
                    />
                  ) : null}
                </div>
                <ul>
                  {g.debts.map((d) => {
                    const from = playersById.get(d.fromPlayerId);
                    const to = playersById.get(d.toPlayerId);
                    const canSettle = canSettleDebt({
                      creditorId: d.toPlayerId,
                      userId: me,
                      sessionStartsAt: d.sessionStartsAt,
                      isAppAdmin,
                    });
                    return (
                      <DebtRow
                        key={d.id}
                        debt={d}
                        slug={slug}
                        claimedLabel={
                          d.paymentClaimedAt
                            ? role === "owed_to_me"
                              ? "Dice que ya pagó"
                              : "Avisaste que pagaste"
                            : undefined
                        }
                        trailing={
                          <div className="flex items-center gap-2">
                            {role === "i_owe" ? (
                              <ClaimDebtPaidButton
                                debtIds={[d.id]}
                                claimed={Boolean(d.paymentClaimedAt)}
                              />
                            ) : null}
                            {canSettle ? (
                              <SettleDebtButton
                                debtId={d.id}
                                fromName={from?.displayName ?? "Alguien"}
                                toName={to?.displayName ?? "Alguien"}
                                amountLabel={formatSoles(d.amount)}
                              />
                            ) : null}
                          </div>
                        }
                      />
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function DebtRow({
  debt,
  slug,
  label,
  claimedLabel,
  trailing,
}: {
  debt: DebtWithSession;
  slug: string;
  label?: string;
  claimedLabel?: string;
  trailing?: ReactNode;
}) {
  const when = formatSessionWhen(debt.sessionStartsAt);
  const fechaLabel = `${formatSessionChip(debt.sessionStartsAt)} · ${when.time}`;
  return (
    <li className="border-b border-ink/6 px-4 py-3 text-[0.9rem] last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {label ? (
            <p className="font-medium text-ink">{label}</p>
          ) : null}
          <Link
            href={`/grupos/${slug}/sessions/${debt.sessionId}`}
            className={`block truncate text-[0.8rem] text-muted hover:text-ink ${label ? "mt-0.5" : ""}`}
          >
            {fechaLabel}
            {debt.sessionCourtLabel ? ` · ${debt.sessionCourtLabel}` : ""}
          </Link>
          {claimedLabel ? (
            <p className="mt-0.5 text-[0.75rem] text-ok">{claimedLabel}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-medium tabular-nums text-ink">
            {formatSoles(debt.amount)}
          </span>
          {trailing}
        </div>
      </div>
    </li>
  );
}
