import { auth, signIn } from "@/auth";
import { BrandMark } from "@/components/BrandMark";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const { callbackUrl } = await searchParams;
  if (session?.user) {
    redirect(callbackUrl || "/");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm animate-rise text-center">
        <div className="mb-8 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Entra al grupo
        </h1>
        <p className="mt-2 text-[0.95rem] text-muted">
          Cualquiera con el link puede unirse con Google.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signIn("google", {
              redirectTo: callbackUrl || "/",
            });
          }}
        >
          <PendingSubmitButton
            pendingLabel="Abriendo Google…"
            className="w-full rounded-2xl bg-sand px-4 py-3.5 text-[1rem] font-medium text-ink ring-1 ring-ink/10 transition active:scale-[0.99]"
          >
            Continuar con Google
          </PendingSubmitButton>
        </form>
      </div>
    </div>
  );
}
