"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandLockup from "@/components/BrandLockup";
import SourceLogo from "@/components/SourceLogo";
import { landingCopy as t } from "@/lib/landing-copy";
import { COPYRIGHT_HOLDER, COPYRIGHT_YEAR, GITHUB_REPO_URL, INSTALL_COMMAND } from "@/lib/site";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const response = await fetch("/api/agents/discover");
        const data = await response.json();
        if (data.registry?.agents?.length || data.connectors?.some((item: { connected?: boolean }) => item.connected)) {
          router.replace("/agents");
          return;
        }
      } catch {
        // Show the landing if discovery fails.
      }
      setReady(true);
    };
    void check();
  }, [router]);

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0c] text-[13px] text-zinc-500">
        Loading…
      </div>
    );
  }

  const ctaHref = "/onboard";
  const ctaLabel = t.ctaRegister;

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-zinc-100">
      <header className="relative z-20 border-b border-zinc-800/80 bg-[#0b0b0c]/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <BrandLockup />
          <div className="flex items-center gap-1.5">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[14px] text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100"
            >
              <GitHubMark className="h-4 w-4" />
              {t.github}
            </a>
            <Link
              href={ctaHref}
              className="rounded-md bg-[#e0783a] px-4 py-2 text-[14px] font-medium text-zinc-950 hover:bg-[#ec8a4e]"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-y-0 right-0 w-full max-w-[1024px]">
            <Image
              src="/hero.webp"
              alt=""
              fill
              priority
              unoptimized
              sizes="(max-width: 1024px) 100vw, 1024px"
              className="object-cover object-center opacity-70"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0c] from-[18%] via-[#0b0b0c]/88 via-[48%] to-[#0b0b0c]/55 to-[100%]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b0b0c]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-10 pt-14 sm:pb-12 sm:pt-16">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 max-w-xl text-[32px] font-medium leading-tight tracking-tight sm:text-[40px]">
            {t.headline[0]}
            <br />
            {t.headline[1]}
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">{t.lead}</p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={ctaHref}
              className="rounded-md bg-[#e0783a] px-4 py-2 text-[13px] font-medium text-zinc-950 hover:bg-[#ec8a4e]"
            >
              {ctaLabel}
            </Link>
            <p className="text-[12px] text-zinc-600">{t.localNote}</p>
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-16">
        <section className="rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-5 sm:px-5">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            {t.recallLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 rounded-md border border-zinc-800/80 bg-[#0b0b0c] px-3 py-2 text-[13px] text-zinc-200">
              {t.recallQuery}
            </div>
            <div className="rounded-md bg-[#e0783a] px-3 py-2 text-[13px] font-medium text-zinc-950">
              {t.recallAsk}
            </div>
          </div>
          <article className="mt-4 rounded-md border border-zinc-800/80 bg-[#0b0b0c] px-4 py-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {t.alreadyFound}
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-zinc-200">{t.recallAnswer}</p>
          </article>
          <div className="mt-4 overflow-hidden rounded-md border border-zinc-800/80 bg-[#0b0b0c]">
            <header className="border-b border-zinc-800/80 bg-[#17171a] px-4 py-2.5 text-[11px] text-zinc-500">
              {t.receiptsLabel}
            </header>
            <div className="flex items-start gap-3 border-b border-zinc-800/50 px-4 py-2.5">
              <SourceLogo source="claude-code" className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-zinc-200">{t.recallHit1}</div>
                <div className="mt-0.5 text-[12px] text-zinc-500">{t.recallHit1Meta}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-2.5">
              <SourceLogo source="cursor" className="mt-1 h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] text-zinc-200">{t.recallHit2}</div>
                <div className="mt-0.5 text-[12px] text-zinc-500">{t.recallHit2Meta}</div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-[11px] text-zinc-600">{t.sketchCaption}</p>
        </section>

        <section className="mt-10 rounded-md border border-zinc-800/80 bg-[#111113] px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{t.whoTitle}</div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                  <SourceLogo source="claude-code" className="h-3.5 w-3.5 text-zinc-300" />
                  {t.whoClaude}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                  <SourceLogo source="codex" className="h-3.5 w-3.5 text-zinc-300" />
                  {t.whoGpt}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-zinc-300">
                  <SourceLogo source="cursor" className="h-3.5 w-3.5 text-zinc-300" />
                  {t.whoCursor}
                </div>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{t.whyTitle}</div>
              <p className="mt-2 text-[13px] leading-snug text-zinc-300">{t.whyBody}</p>
              <p className="mt-1.5 font-mono text-[11px] leading-snug text-zinc-500">
                ~/.claude · ~/.codex · ~/.cursor
              </p>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[14px] font-medium">{t.howTitle}</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{t.howLead}</p>
          <ol className="mt-4 space-y-4">
            {t.steps.map((item) => (
              <li key={item.step} className="flex gap-4 border-t border-zinc-800/80 pt-4">
                <span className="w-8 shrink-0 font-mono text-[12px] text-zinc-600">{item.step}</span>
                <div>
                  <div className="text-[13px] font-medium text-zinc-100">{item.title}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-14">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            {t.installLabel}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md border border-zinc-800 bg-[#111113] px-4 py-3 font-mono text-[12px] leading-relaxed text-zinc-300">
            {INSTALL_COMMAND}
          </pre>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void copyInstall()}
              className="rounded-md border border-zinc-800 px-4 py-2 text-[13px] text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
            >
              {copied ? t.copied : t.copyInstall}
            </button>
          </div>
        </section>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/80 pt-8">
          <p className="max-w-md text-[13px] text-zinc-500">{t.footer}</p>
          <Link
            href={ctaHref}
            className="rounded-md bg-[#e0783a] px-4 py-2 text-[13px] font-medium text-zinc-950 hover:bg-[#ec8a4e]"
          >
            {ctaLabel}
          </Link>
        </div>

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 py-6 text-[12px] text-zinc-600">
          <p>
            © {COPYRIGHT_YEAR} {COPYRIGHT_HOLDER}
          </p>
          <nav className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-300">
              Privacy policy
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              Terms of use
            </Link>
          </nav>
        </footer>
      </main>
    </div>
  );
}
