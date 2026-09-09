import type { ReactNode } from "react";
import Link from "next/link";
import BrandLockup from "@/components/BrandLockup";
import { COPYRIGHT_HOLDER, COPYRIGHT_YEAR } from "@/lib/site";

export default function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-zinc-100">
      <header className="border-b border-zinc-800/80">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <BrandLockup />
          <Link href="/" className="text-[14px] text-zinc-400 hover:text-zinc-100">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-12">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">Legal</p>
        <h1 className="mt-2 text-[24px] font-medium tracking-tight">{title}</h1>
        <div className="mt-8 space-y-5 text-[14px] leading-relaxed text-zinc-400">{children}</div>
      </main>
      <footer className="mx-auto w-full max-w-3xl px-4 pb-10">
        <p className="border-t border-zinc-800/80 pt-6 text-[12px] text-zinc-600">
          © {COPYRIGHT_YEAR} {COPYRIGHT_HOLDER}
        </p>
      </footer>
    </div>
  );
}
