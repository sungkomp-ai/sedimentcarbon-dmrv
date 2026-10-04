"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { type Locale, TRANSLATIONS, translate } from "./translations";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
  /** Format a number using locale-aware thousands separators. */
  fmt: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Format a date. Buddhist Era for TH, Gregorian for EN. */
  fmtDate: (d: Date | string | null, opts?: Intl.DateTimeFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "th" ? "th" : "en";
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => translate(locale, key, fallback),
    [locale]
  );

  const fmt = useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", opts).format(n),
    [locale]
  );

  const fmtDate = useCallback(
    (d: Date | string | null, opts?: Intl.DateTimeFormatOptions) => {
      if (!d) return "—";
      const date = typeof d === "string" ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return "—";
      const defaultOpts: Intl.DateTimeFormatOptions = opts ?? {
        year: "numeric",
        month: "short",
        day: "2-digit",
      };
      const calendar = locale === "th" ? "buddhist" : "gregory";
      return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
        ...defaultOpts,
        calendar,
      }).format(date);
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, fmt, fmtDate }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Provide a safe fallback if used outside provider (e.g., during SSR tests).
    return {
      locale: "th" as Locale,
      setLocale: () => {},
      t: (k: string, f?: string) => TRANSLATIONS.th[k] ?? f ?? k,
      fmt: (n: number) => String(n),
      fmtDate: (d: Date | string | null) =>
        d ? new Date(typeof d === "string" ? d : d).toLocaleDateString() : "—",
    } satisfies I18nContextValue;
  }
  return ctx;
}
