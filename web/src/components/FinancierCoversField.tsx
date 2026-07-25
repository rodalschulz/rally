export function FinancierCoversField({
  defaultChecked = false,
}: {
  defaultChecked?: boolean;
}) {
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
        <span className="block text-[0.95rem] font-medium text-ink">
          Yo regalo la cancha
        </span>
        <span className="mt-0.5 block text-[0.8rem] text-muted">
          Quedas como único financiador: nadie te debe por esta fecha.
        </span>
      </span>
    </label>
  );
}
