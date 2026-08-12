"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type HelpTip = {
  title: string;
  desc: string;
};

type HelpTab = {
  id: string;
  label: string;
  intro: string;
  tips: HelpTip[];
};

/** User-facing guide. Ordered by how people actually use the app. */
const TABS: HelpTab[] = [
  {
    id: "grupos",
    label: "Grupos",
    intro: "Todo pasa dentro de un grupo de amigos.",
    tips: [
      {
        title: "Únete o crea",
        desc: "Entra con el link de invitación que te comparten, o crea tu propio grupo desde la pestaña Grupos.",
      },
      {
        title: "Cambia de grupo",
        desc: "Toca Grupos en la barra de abajo para ver todos tus grupos y saltar entre ellos.",
      },
      {
        title: "Integrantes e invitaciones",
        desc: "Toca el ícono de personas junto al nombre del grupo para ver quiénes están. Si eres dueño, ahí copias el link para invitar.",
      },
    ],
  },
  {
    id: "fechas",
    label: "Fechas",
    intro: "Una Fecha es un día de tenis: hora, cancha y quién juega.",
    tips: [
      {
        title: "Marca si vas",
        desc: "En cada Fecha eliges Voy, Quizás o No voy. Así todos saben con quién contar.",
      },
      {
        title: "Cancha y financiador",
        desc: "La Fecha guarda el costo de la cancha y quién la paga (el financiador). Con eso se arman las deudas.",
      },
      {
        title: "Se graba en piedra",
        desc: "Cuando la Fecha ya pasó, la asistencia queda fija: nadie (ni un admin) puede cambiar quién fue.",
      },
    ],
  },
  {
    id: "resultados",
    label: "Resultados",
    intro: "Registra lo que se jugó para alimentar el ranking.",
    tips: [
      {
        title: "Games y Sets",
        desc: "Dentro de una Fecha agregas Games sueltos o Sets. Solo puedes registrar si marcaste que fuiste.",
      },
      {
        title: "Ganador y servidor",
        desc: "Cada Game necesita un ganador. Si quieres, marcas quién sacaba (el Servidor) para tus estadísticas.",
      },
      {
        title: "En curso e historial",
        desc: "Un Set puede quedar En curso y completarse después. Si borras un resultado, queda en el Historial y desde ahí puedes restaurarlo.",
      },
    ],
  },
  {
    id: "ranking",
    label: "Ranking",
    intro: "El ranking usa Elo y arranca en 1000 para todos.",
    tips: [
      {
        title: "Games y Sets aparte",
        desc: "Hay un ranking por Games y otro por Sets. Cambia entre ellos con el selector de arriba.",
      },
      {
        title: "Toca un jugador",
        desc: "En el Ranking, toca a cualquier jugador para abrir su ficha: historial de Elo, racha más larga, rival más jugado, asistencia y más.",
      },
      {
        title: "Stats de una Fecha",
        desc: "En el Resumen de una Fecha, toca a un jugador para ver cómo le fue Game por Game solo ese día.",
      },
    ],
  },
  {
    id: "deudas",
    label: "Deudas",
    intro: "Las deudas se calculan solas al repartir la cancha.",
    tips: [
      {
        title: "Quién le debe a quién",
        desc: "El costo de la Fecha se divide entre quienes fueron. Si otro pagó, te queda una deuda con esa persona.",
      },
      {
        title: "Pagar (Yape / Plin)",
        desc: "En Ajustes guarda tu celular. En Debes, toca Pagar: ves el número del acreedor, copias el monto o abres WhatsApp con el mensaje listo. La plata va directo entre ustedes; rally no cobra.",
      },
      {
        title: "Ya pagué y Saldar",
        desc: "Cuando transferiste, avisa con Ya pagué (le llega notificación). Quien recibió confirma con Saldar cuando la fecha ya pasó. Queda en el historial.",
      },
      {
        title: "Notificaciones",
        desc: "Activa las notificaciones en Ajustes para enterarte de nuevas Fechas, cambios y deudas. En iPhone/iPad hay que agregar rally a la pantalla de inicio (como app) para poder recibirlas.",
      },
    ],
  },
];

/** Pick the help tab that best matches where the user currently is. */
function tabForPath(pathname: string): string {
  if (
    pathname === "/" ||
    pathname.startsWith("/grupos/nuevo") ||
    pathname.startsWith("/join/")
  ) {
    return "grupos";
  }
  if (pathname.includes("/rankings")) return "ranking";
  if (pathname.includes("/deudas")) return "deudas";
  // Session detail = where results / historial live.
  if (pathname.includes("/sessions/")) return "resultados";
  // Group hub (Fechas list) or group ajustes.
  if (/^\/grupos\/[^/]+/.test(pathname)) return "fechas";
  return "grupos";
}

export function HelpButton() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [activeTab, setActiveTab] = useState(TABS[0]!.id);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function openHelp() {
    setActiveTab(tabForPath(pathname));
    setOpen(true);
  }

  const tab = TABS.find((t) => t.id === activeTab) ?? TABS[0]!;

  return (
    <>
      <button
        type="button"
        onClick={openHelp}
        aria-label="Cómo funciona"
        title="Cómo funciona"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-ink active:scale-95"
      >
        <InfoIcon />
      </button>

      {portalReady && open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 pb-[max(0.75rem,var(--safe-bottom))] sm:p-4"
              role="presentation"
              onClick={() => setOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-title"
                className="flex h-[min(80vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-sand shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 border-b border-ink/6 px-4 py-3">
                  <div className="min-w-0">
                    <h2
                      id="help-title"
                      className="text-[1.05rem] font-semibold tracking-[-0.02em] text-ink"
                    >
                      Cómo funciona rally
                    </h2>
                    <p className="mt-0.5 text-[0.75rem] text-muted">
                      Una guía rápida de lo que puedes hacer.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 rounded-lg px-2 py-1 text-[0.9rem] font-medium text-muted"
                    aria-label="Cerrar"
                  >
                    Cerrar
                  </button>
                </div>

                <div
                  className="flex shrink-0 gap-1 overflow-x-auto border-b border-ink/6 px-2 py-2"
                  role="tablist"
                  aria-label="Secciones de ayuda"
                >
                  {TABS.map((t) => {
                    const active = t.id === activeTab;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveTab(t.id)}
                        className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8rem] font-medium transition ${
                          active
                            ? "bg-ink text-mist"
                            : "bg-mist-2 text-muted hover:text-ink"
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
                  role="tabpanel"
                >
                  <p className="mb-3 text-[0.85rem] leading-relaxed text-muted">
                    {tab.intro}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {tab.tips.map((tip) => (
                      <li
                        key={tip.title}
                        className="rounded-xl bg-mist-2 px-3.5 py-3"
                      >
                        <p className="text-[0.9rem] font-semibold text-ink">
                          {tip.title}
                        </p>
                        <p className="mt-1 text-[0.85rem] leading-relaxed text-muted">
                          {tip.desc}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function InfoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 11v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <circle cx="12" cy="7.75" r="1.05" fill="currentColor" />
    </svg>
  );
}
