export function FinancierCoversField({
  defaultChecked = false,
  payerIsSelf = true,
}: {
  defaultChecked?: boolean;
  /** False when the editor is not the person who paid. */
  payerIsSelf?: boolean;
}) {
  const title = payerIsSelf ? "Yo regalo la cancha" : "Regala la cancha";
  const hint = payerIsSelf
    ? "Quedas como único financiador: nadie te debe por esta fecha."
    : "El financiador cubre el costo: nadie le debe por esta fecha.";

  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sand px-4 py-3.5">
      <input
        type="checkbox"
        name="financierCoversAll"
        value="true"
        defaultChecked={defaultChecked}
        className="mt-1 size-4 shrink-0 accent-[var(--ball)]"
      />
      <span className="min-w-0">
        <span className="block text-[0.95rem] font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-[0.8rem] text-muted">{hint}</span>
      </span>
    </label>
  );
}
