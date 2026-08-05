/** Full-route fallback while group layout (membership + shell) resolves. */
export function GroupRouteSkeleton() {
  return (
    <div className="app-shell" style={{ backgroundColor: "#000000" }}>
      <header className="app-header sticky top-0 z-30 border-b border-ink/6 bg-mist/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <div className="h-4 w-16 animate-pulse rounded bg-mist-2" />
          <div className="h-4 w-14 animate-pulse rounded bg-mist-2" />
        </div>
      </header>
      <main className="app-main">
        <GroupPageSkeleton />
      </main>
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/6 bg-mist/90"
        style={{ paddingBottom: "var(--safe-bottom)" }}
        aria-hidden
      >
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-around px-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-10 animate-pulse rounded bg-mist-2" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Page-area skeleton (inside AppShell) for tab / fecha transitions. */
export function GroupPageSkeleton() {
  return (
    <div className="animate-pulse pt-1" aria-busy aria-label="Cargando">
      <div className="mb-8 h-8 w-48 rounded-lg bg-mist-2" />
      <div className="mb-2 h-5 w-24 rounded bg-mist-2" />
      <div className="overflow-hidden rounded-2xl bg-sand">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-ink/6 px-4 py-3.5 last:border-b-0"
          >
            <div className="h-10 w-11 shrink-0 rounded-lg bg-mist-2" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-28 rounded bg-mist-2" />
              <div className="h-3 w-40 rounded bg-mist-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SessionPageSkeleton() {
  return (
    <div className="animate-pulse" aria-busy aria-label="Cargando fecha">
      <div className="mb-5 h-4 w-20 rounded bg-mist-2" />
      <div className="mb-2 h-3 w-14 rounded bg-mist-2" />
      <div className="mb-1 h-9 w-24 rounded-lg bg-mist-2" />
      <div className="mb-8 h-4 w-36 rounded bg-mist-2" />
      <div className="mb-2 h-5 w-28 rounded bg-mist-2" />
      <div className="mb-8 h-12 rounded-2xl bg-sand" />
      <div className="mb-2 h-5 w-24 rounded bg-mist-2" />
      <div className="overflow-hidden rounded-2xl bg-sand">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-ink/6 px-4 py-3 last:border-b-0"
          >
            <div className="h-9 w-9 rounded-full bg-mist-2" />
            <div className="h-4 flex-1 rounded bg-mist-2" />
            <div className="h-5 w-12 rounded-full bg-mist-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AvailabilitySkeleton() {
  return (
    <span
      className="inline-block h-8 w-[4.5rem] animate-pulse rounded-full bg-sand ring-1 ring-ink/10"
      aria-hidden
    />
  );
}
