import Link from "next/link";

export function RankingTabs({
  slug,
  active,
}: {
  slug: string;
  active: "singles" | "doubles";
}) {
  const base = `/grupos/${slug}/rankings`;
  return (
    <div className="mb-4 flex gap-1 rounded-xl bg-mist-2 p-1">
      <Tab
        href={`${base}/singles?unit=game`}
        label="Singles"
        active={active === "singles"}
      />
      <Tab href={`${base}/doubles`} label="Dobles" active={active === "doubles"} />
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
