export type LandingLocale = "en" | "ko";

export function isKorea(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Seoul") {
      return true;
    }
  } catch {
    // ignore missing Intl
  }

  const tags = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const tag of tags) {
    try {
      const locale = new Intl.Locale(tag);
      if (locale.region === "KR") return true;
    } catch {
      if (/(^|-)kr$/i.test(tag)) return true;
    }
  }

  return false;
}
