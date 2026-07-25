import Link from "next/link";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2">
      <span
        className="grid size-7 place-items-center rounded-full bg-ball text-[0.7rem] font-semibold text-on-ball"
        aria-hidden
      >
        r
      </span>
      <span
        className={`font-semibold tracking-[-0.02em] text-ink ${
          compact ? "text-[1.05rem]" : "text-xl"
        }`}
      >
        rally
      </span>
    </Link>
  );
}
