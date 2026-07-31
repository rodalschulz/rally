"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  key: string;
  label: string;
  icon: (p: { active: boolean }) => React.ReactNode;
  href?: string;
  disabled?: boolean;
  isActive: (pathname: string) => boolean;
};

export function BottomNav({ slug }: { slug?: string }) {
  const pathname = usePathname();
  const items = navItems(slug);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/6 bg-sand/85 backdrop-blur-xl"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Principal"
    >
      <ul
        className="mx-auto grid max-w-lg grid-cols-5 px-0.5"
        style={{ height: "var(--nav-h)" }}
      >
        {items.map(({ key, label, icon: Icon, href, disabled, isActive }) => {
          const active = !disabled && isActive(pathname);
          const className = `flex h-full flex-col items-center justify-center gap-0.5 text-[0.6rem] transition ${
            disabled
              ? "cursor-not-allowed text-muted/35"
              : active
                ? "font-medium text-ink"
                : "font-normal text-muted"
          }`;

          return (
            <li key={key}>
              {disabled || !href ? (
                <span
                  className={className}
                  aria-disabled="true"
                  title="Entra a un grupo"
                >
                  <Icon active={false} />
                  {label}
                </span>
              ) : (
                <Link href={href} className={className}>
                  <Icon active={active} />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function navItems(slug?: string): NavItem[] {
  const base = slug ? `/grupos/${slug}` : null;

  return [
    {
      key: "grupos",
      label: "Grupos",
      icon: HomeIcon,
      href: "/",
      isActive: (p) =>
        p === "/" || p.startsWith("/grupos/nuevo") || p.startsWith("/join/"),
    },
    {
      key: "fechas",
      label: "Fechas",
      icon: CalendarIcon,
      href: base ?? undefined,
      disabled: !base,
      isActive: (p) =>
        !!base && (p === base || p.startsWith(`${base}/sessions`)),
    },
    {
      key: "ranking",
      label: "Ranking",
      icon: RankIcon,
      href: base ? `${base}/rankings/singles?unit=game` : undefined,
      disabled: !base,
      isActive: (p) => !!base && p.startsWith(`${base}/rankings`),
    },
    {
      key: "deudas",
      label: "Deudas",
      icon: WalletIcon,
      href: base ? `${base}/deudas` : undefined,
      disabled: !base,
      isActive: (p) => !!base && p.startsWith(`${base}/deudas`),
    },
    {
      key: "ajustes",
      label: "Ajustes",
      icon: GearIcon,
      href: base ? `${base}/ajustes` : "/ajustes",
      isActive: (p) =>
        base
          ? p.startsWith(`${base}/ajustes`)
          : p === "/ajustes" || p.startsWith("/ajustes/"),
    },
  ];
}

function HomeIcon({ active }: { active: boolean }) {
  const w = active ? 1.8 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinejoin="round"
      />
    </svg>
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

function GearIcon({ active }: { active: boolean }) {
  const w = active ? 1.8 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={w} />
      <path
        d="M12 3.5v2.2M12 18.3V20.5M3.5 12h2.2M18.3 12h2.2M6.1 6.1l1.6 1.6M16.3 16.3l1.6 1.6M17.9 6.1l-1.6 1.6M7.7 16.3l-1.6 1.6"
        stroke="currentColor"
        strokeWidth={w}
        strokeLinecap="round"
      />
    </svg>
  );
}
