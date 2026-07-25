import { AppShell } from "@/components/AppShell";
import { CreateGroupForm } from "@/components/CreateGroupForm";

export const dynamic = "force-dynamic";

export default function NewGroupPage() {
  return (
    <AppShell>
      <section className="animate-rise mb-6">
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Nuevo grupo
        </h1>
        <p className="mt-1 text-[0.95rem] text-muted">
          Los privados solo se unen con link + contraseña.
        </p>
      </section>

      <CreateGroupForm />
    </AppShell>
  );
}
