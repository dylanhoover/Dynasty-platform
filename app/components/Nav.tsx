"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/draft", label: "Draft" },
  { href: "/mock", label: "Mock Draft" },
  { href: "/roster", label: "Roster" },
  { href: "/trade", label: "Trade & Value" },
  { href: "/research", label: "Research" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-3">
        <span className="mr-4 text-sm font-semibold tracking-wide text-zinc-200">
          Dynasty HQ
        </span>
        <nav className="flex gap-1">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
