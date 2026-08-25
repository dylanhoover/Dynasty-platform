"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function SetMyTeamButton({ rosterId }: { rosterId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/settings/my-roster", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rosterId }),
          });
          router.refresh();
        });
      }}
      className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-indigo-500 hover:text-indigo-300 disabled:opacity-50"
    >
      This is me
    </button>
  );
}
