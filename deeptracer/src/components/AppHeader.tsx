"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Runs" },
  { href: "/agents", label: "Agents" },
  { href: "/analyze", label: "Analyze" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-[#0b0b0c] px-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center" aria-label="deeptracer home">
          <Image
            src="/logo-dark.png"
            alt="deeptracer"
            width={154}
            height={40}
            className="h-7 w-auto"
            priority
          />
        </Link>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === "/analyze"
                ? pathname === "/analyze"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2.5 py-1 text-[13px] transition-colors ${
                  active
                    ? "bg-zinc-800/80 text-zinc-100"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <p className="hidden text-[12px] text-zinc-600 sm:block">Trace the cause</p>
    </header>
  );
}
