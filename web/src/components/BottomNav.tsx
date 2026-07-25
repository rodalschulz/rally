"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { segment: "", label: "Fechas", icon: CalendarIcon },
  { segment: "/rankings/singles", label: "Singles", icon: RankIcon },
  { segment: "/rankings/doubles", label: "Dobles", icon: PairIcon },
  { segment: "/deudas", label: "Deudas", icon: WalletIcon },
] as const;

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/grupos/${slug}`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/6 bg-sand/85 backdrop-blur-xl"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Principal"
    >
      <ul
        className="mx-auto grid max-w-lg grid-cols-4 px-1"
        style={{ height: "var(--nav-h)" }}
      >
        {items.map(({ segment, label, icon: Icon }) => {
          const href = `${base}${segment}`;
          const active =
            segment === ""
              ? pathname === base || pathname.startsWith(`${base}/sessions`)
              : pathname === href || pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[0.65rem] transition ${
                  active ? "font-medium text-ink" : "font-normal text-muted"
                }`}
              >
                <Icon active={active} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
      />
      <path
        d="M8 3.5v3M16 3.5v3M3.5 9.5h17"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function RankIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 19V11M12 19V5M18 19v-6"
        stroke="currentColor"
        strokeWidth={active ? 1.9 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function PairIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="9"
        cy="10"
        r="3"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
      />
      <circle
        cx="15.5"
        cy="10"
        r="3"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
      />
      <path
        d="M4.5 19c.8-2.4 2.6-3.6 4.5-3.6s3.7 1.2 4.5 3.6M10.5 19c.8-2.4 2.6-3.6 4.5-3.6s3.7 1.2 4.5 3.6"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletIcon({ active }: { active: boolean }) {
  const w = active ? 1.8 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="7"
        width="18"
        height="12"
        rx="2.5"
        stroke="currentColor"
        strokeWidth={w}
      />
      <path
        d="M3 10h18"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
      <circle cx="16.5" cy="14.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
