"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";

const links = [
  { href: "/recall", label: "Recall" },
  { href: "/dashboard", label: "Runs" },
  { href: "/agents", label: "Agents" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-zinc-800/80 bg-[#0b0b0c]">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <BrandLockup />
          <nav className="flex items-center gap-0.5">
            {links.map((link) => {
              const active =
                link.href === "/analyze"
                  ? pathname === "/analyze"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-1.5 text-[14px] transition-colors ${
                    active
                      ? "bg-zinc-800/80 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <p className="hidden text-[13px] text-zinc-600 sm:block">Already found</p>
      </div>
    </header>
  );
}
