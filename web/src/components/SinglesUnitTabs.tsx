import Link from "next/link";
import type { MatchUnit } from "@/lib/domain/types";

export function SinglesUnitTabs({
  slug,
  active,
}: {
  slug: string;
  active: MatchUnit;
}) {
  const base = `/grupos/${slug}/rankings/singles`;
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-mist-2 p-1">
      <Tab href={`${base}?unit=game`} label="Games" active={active === "game"} />
      <Tab href={`${base}?unit=set`} label="Sets" active={active === "set"} />
    </div>
  );
}

function Tab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 rounded-lg py-2 text-center text-[0.9rem] font-medium transition ${
        active ? "bg-sand text-ink shadow-sm" : "text-muted"
      }`}
    >
      {label}
    </Link>
  );
}
