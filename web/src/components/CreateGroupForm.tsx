"use client";

import { useState } from "react";
import { PendingSubmitButton } from "@/components/PendingSubmitButton";
import { createGroupAction } from "@/lib/actions/groups";

export function CreateGroupForm() {
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  return (
    <form action={createGroupAction} className="animate-rise space-y-4">
      <label className="block text-[0.8rem] text-muted">
        Nombre
        <input
          name="name"
          required
          placeholder="Miraflores tenis"
          className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
        />
      </label>
      <label className="block text-[0.8rem] text-muted">
        Descripción (opcional)
        <input
          name="description"
          placeholder="Los jueves a la tarde"
          className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-[0.8rem] text-muted">Visibilidad</legend>
        <div className="flex gap-1 rounded-xl bg-mist-2 p-1">
          <label
            className={`flex-1 cursor-pointer rounded-lg py-2.5 text-center text-[0.9rem] font-medium ${
              visibility === "private"
                ? "bg-sand text-ink shadow-sm"
                : "text-muted"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="private"
              className="sr-only"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            Privado
          </label>
          <label
            className={`flex-1 cursor-pointer rounded-lg py-2.5 text-center text-[0.9rem] font-medium ${
              visibility === "public"
                ? "bg-sand text-ink shadow-sm"
                : "text-muted"
            }`}
          >
            <input
              type="radio"
              name="visibility"
              value="public"
              className="sr-only"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            Público
          </label>
        </div>
      </fieldset>

      {visibility === "private" ? (
        <label className="block text-[0.8rem] text-muted">
          Contraseña del grupo
          <input
            type="password"
            name="password"
            required
            minLength={4}
            placeholder="Mín. 4 caracteres"
            className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink placeholder:text-muted"
          />
        </label>
      ) : null}

      <label className="block text-[0.8rem] text-muted">
        Máximo de miembros
        <input
          type="number"
          name="maxMembers"
          min={2}
          max={200}
          defaultValue={20}
          required
          className="mt-1 w-full rounded-xl bg-sand px-3 py-3 text-ink"
        />
      </label>

      <PendingSubmitButton
        pendingLabel="Creando…"
        className="w-full rounded-2xl bg-ball py-3.5 text-[1rem] font-semibold text-on-ball"
      >
        Crear grupo
      </PendingSubmitButton>
    </form>
  );
}
