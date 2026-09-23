import Link from "next/link";
import type { ReactNode } from "react";
import { ClaimDebtPaidButton } from "@/components/ClaimDebtPaidButton";
import { PayDebtButton } from "@/components/PayDebtSheet";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { SettleDebtButton } from "@/components/SettleDebtButton";
import { SettleNetPairButton } from "@/components/SettleNetPairButton";
import { canSettleDebt, canSettleNetPair } from "@/lib/debts/permissions";
import {
  netPairDebtIds,
  type NetDebtPair,
} from "@/lib/debts/netPairs";
import type { DebtWithSession, Player } from "@/lib/domain/types";
import { formatSessionChip, formatSessionWhen, formatSoles } from "@/lib/format";

type Pair = NetDebtPair<DebtWithSession>;

export function OpenDebtsSections({
  slug,
  me,
  isAppAdmin,
  owedToMe,
  iOwe,
  settledOff,
  others,
  playersById,
}: {
  slug: string;
  me: string;
  isAppAdmin: boolean;
  owedToMe: Pair[];
  iOwe: Pair[];
  settledOff: Pair[];
  others: Pair[];
  playersById: Map<string, Player>;
}) {
  const empty =
    owedToMe.length === 0 &&
    iOwe.length === 0 &&
    settledOff.length === 0 &&
    others.length === 0;

  if (empty) {
    return <p className="text-[0.95rem] text-muted">Nadie se debe nada.</p>;
  }

  return (
    <div className="space-y-8">
      <DebtRoleSection
        title="Te deben"
        empty="Nadie te debe."
        pairs={owedToMe}
        playersById={playersById}
        slug={slug}
        me={me}
        isAppAdmin={isAppAdmin}
        role="owed_to_me"
      />
      <DebtRoleSection
        title="Debes"
        empty="No debes nada."
        pairs={iOwe}
        playersById={playersById}
        slug={slug}
        me={me}
        isAppAdmin={isAppAdmin}
        role="i_owe"
      />
      {settledOff.length > 0 ? (
        <DebtRoleSection
          title="En cero"
          empty=""
          pairs={settledOff}
          playersById={playersById}
          slug={slug}
          me={me}
          isAppAdmin={isAppAdmin}
          role="zero"
        />
      ) : null}
      {others.length > 0 ? (
        <DebtRoleSection
          title="Entre otros"
          empty=""
          pairs={others}
          playersById={playersById}
          slug={slug}
          me={me}
          isAppAdmin={isAppAdmin}
          role="other"
        />
      ) : null}
    </div>
  );
}

function DebtRoleSection({
  title,
  empty,
  pairs,
  playersById,
  slug,
  me,
  isAppAdmin,
  role,
}: {
  title: string;
  empty: string;
  pairs: Pair[];
  playersById: Map<string, Player>;
  slug: string;
  me: string;
  isAppAdmin: boolean;
  role: "owed_to_me" | "i_owe" | "zero" | "other";
}) {
  return (
    <section>
      <h2 className="mb-2 text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      {pairs.length === 0 ? (
        <p className="text-[0.95rem] text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {pairs.map((pair) => (
            <PairCard
              key={`${pair.debtorId}:${pair.creditorId}`}
              pair={pair}
              playersById={playersById}
              slug={slug}
              me={me}
              isAppAdmin={isAppAdmin}
              role={role}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PairCard({
  pair,
  playersById,
  slug,
  me,
  isAppAdmin,
  role,
}: {
  pair: Pair;
  playersById: Map<string, Player>;
  slug: string;
  me: string;
  isAppAdmin: boolean;
  role: "owed_to_me" | "i_owe" | "zero" | "other";
}) {
  const debtor = playersById.get(pair.debtorId);
  const creditor = playersById.get(pair.creditorId);
  const counterpartyId = role === "i_owe" || role === "zero"
    ? pair.debtorId === me
      ? pair.creditorId
      : pair.debtorId
    : role === "owed_to_me"
      ? pair.debtorId
      : pair.debtorId;
  const counterparty =
    role === "other" ? null : playersById.get(counterpartyId);
  const debtorName = debtor?.displayName ?? "Alguien";
  const creditorName = creditor?.displayName ?? "Alguien";
  const title =
    role === "other"
      ? `${debtorName} → ${creditorName}`
      : (counterparty?.displayName ?? "Alguien");
  const anyClaimed = pair.debtorDebts.some((debt) => debt.paymentClaimedAt);
  const canClose = canSettleNetPair({
    debtorId: pair.debtorId,
    creditorId: pair.creditorId,
    netAmount: pair.netAmount,
    offset: pair.offset,
    userId: me,
    isAppAdmin,
  });

  return (
    <li className="overflow-hidden rounded-2xl bg-sand">
      <div className="flex items-center gap-3 border-b border-ink/6 px-4 py-3">
        {role !== "other" && counterparty ? (
          <PlayerAvatar player={counterparty} size="sm" />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ink">{title}</p>
          <p className="text-[0.8rem] text-muted">
            {pairMeta(pair)}
            {anyClaimed && role === "owed_to_me" ? " · avisó que pagó" : null}
            {anyClaimed && role === "i_owe" ? " · avisaste" : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <span className="font-semibold tabular-nums text-ink">
            {formatSoles(pair.netAmount)}
          </span>
          {canClose ? (
            <SettleNetPairButton
              debtIds={netPairDebtIds(pair)}
              label={pair.netAmount === 0 ? "Cerrar" : "Saldar saldo"}
              confirmMessage={settleNetConfirm(pair, debtorName, creditorName)}
            />
          ) : null}
          {role === "i_owe" && pair.netAmount > 0 && creditor ? (
            <PayDebtButton
              creditor={{
                id: creditor.id,
                displayName: creditor.displayName,
                paymentPhone: creditor.paymentPhone,
                paymentWallet: creditor.paymentWallet,
              }}
              debts={toPayLines(pair.debtorDebts)}
              offsetDebts={
                pair.offset > 0 ? toPayLines(pair.offsetDebts) : undefined
              }
              payAmount={pair.netAmount}
              claimMode={pair.offset > 0 ? "net" : undefined}
            />
          ) : null}
        </div>
      </div>
      {pair.offset > 0 ? (
        <p className="px-4 pt-3 text-[0.75rem] text-muted">
          {listHeading(role, debtorName, "debtor")}
        </p>
      ) : null}
      <ul>
        {pair.debtorDebts.map((debt) => (
          <DebtLine
            key={debt.id}
            debt={debt}
            slug={slug}
            me={me}
            isAppAdmin={isAppAdmin}
            playersById={playersById}
            showClaim={role === "i_owe" && pair.offset === 0}
            hasOffset={pair.offset > 0}
            role={role}
          />
        ))}
      </ul>
      {pair.offsetDebts.length > 0 ? (
        <>
          <p className="px-4 pt-3 text-[0.75rem] text-muted">
            {listHeading(role, creditorName, "offset")}
          </p>
          <ul>
            {pair.offsetDebts.map((debt) => (
              <DebtLine
                key={debt.id}
                debt={debt}
                slug={slug}
                me={me}
                isAppAdmin={isAppAdmin}
                playersById={playersById}
                showClaim={false}
                hasOffset={pair.offset > 0}
                role={role}
              />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

function listHeading(
  role: "owed_to_me" | "i_owe" | "zero" | "other",
  name: string,
  side: "debtor" | "offset",
): string {
  if (role === "zero" || role === "other") return `${name} debe`;
  if (side === "debtor") return role === "i_owe" ? "Lo que debes" : "Te debe";
  return "Se descuenta";
}

function pairMeta(pair: Pair): string {
  const fechaCount = pair.debtorDebts.length + pair.offsetDebts.length;
  const fechas = fechaCount === 1 ? "1 fecha" : `${fechaCount} fechas`;
  if (pair.netAmount === 0) {
    return `Se compensan ${formatSoles(pair.offset)} · ${fechas}`;
  }
  if (pair.offset > 0) {
    return `Se compensan ${formatSoles(pair.offset)} · ${fechas}`;
  }
  return fechas;
}

function settleNetConfirm(pair: Pair, debtorName: string, creditorName: string): string {
  if (pair.netAmount === 0) {
    return `¿Cerrar estas fechas entre ${debtorName} y ${creditorName}? Se compensan ${formatSoles(pair.offset)} de cada lado y no queda saldo.`;
  }
  return `¿Saldar el saldo de ${formatSoles(pair.netAmount)} (${debtorName} → ${creditorName})? Se compensan ${formatSoles(pair.offset)} y se cierran las fechas de los dos lados.`;
}

function toPayLines(debts: DebtWithSession[]) {
  return debts.map((debt) => ({
    id: debt.id,
    amount: debt.amount,
    sessionStartsAt: debt.sessionStartsAt,
    sessionCourtLabel: debt.sessionCourtLabel,
    paymentClaimedAt: debt.paymentClaimedAt,
  }));
}

function DebtLine({
  debt,
  slug,
  me,
  isAppAdmin,
  playersById,
  showClaim,
  hasOffset,
  role,
}: {
  debt: DebtWithSession;
  slug: string;
  me: string;
  isAppAdmin: boolean;
  playersById: Map<string, Player>;
  showClaim: boolean;
  hasOffset: boolean;
  role: "owed_to_me" | "i_owe" | "zero" | "other";
}) {
  const from = playersById.get(debt.fromPlayerId);
  const to = playersById.get(debt.toPlayerId);
  const canSettle = canSettleDebt({
    creditorId: debt.toPlayerId,
    userId: me,
    sessionStartsAt: debt.sessionStartsAt,
    isAppAdmin,
  });
  const claimedLabel = debt.paymentClaimedAt
    ? role === "owed_to_me"
      ? "Dice que ya pagó"
      : role === "i_owe"
        ? "Avisaste que pagaste"
        : undefined
    : undefined;

  return (
    <DebtRow
      debt={debt}
      slug={slug}
      label={
        role === "other"
          ? `${from?.displayName ?? "Alguien"} → ${to?.displayName ?? "Alguien"}`
          : undefined
      }
      claimedLabel={claimedLabel}
      trailing={
        <div className="flex items-center gap-2">
          {showClaim ? (
            <ClaimDebtPaidButton
              debtIds={[debt.id]}
              claimed={Boolean(debt.paymentClaimedAt)}
            />
          ) : null}
          {canSettle ? (
            <SettleDebtButton
              debtId={debt.id}
              fromName={from?.displayName ?? "Alguien"}
              toName={to?.displayName ?? "Alguien"}
              amountLabel={formatSoles(debt.amount)}
              confirmMessage={
                hasOffset
                  ? `¿Saldar solo esta fecha (${formatSoles(debt.amount)})? No cierra el saldo entre ustedes. Lo que queda se vuelve a calcular.`
                  : undefined
              }
            />
          ) : null}
        </div>
      }
    />
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
          {label ? <p className="font-medium text-ink">{label}</p> : null}
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
