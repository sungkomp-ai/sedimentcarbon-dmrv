"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { type Locale, TRANSLATIONS, translate } from "./translations";
import { fmtArea, areaValue, haToRai, raiToHa } from "./area";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, fallback?: string) => string;
  /** Format a number using locale-aware thousands separators. */
  fmt: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Format a date. Buddhist Era for TH, Gregorian for EN. */
  fmtDate: (d: Date | string | null, opts?: Intl.DateTimeFormatOptions) => string;
  /**
   * Format a hectare area in the locale unit (rai for TH, ha for EN).
   * Underlying calculations always stay in ha — only the display is converted.
   */
  fmtArea: (ha: number, opts?: { digits?: number; withUnit?: boolean }) => string;
  /** Numeric area value (no unit), already converted for the locale. */
  areaValue: (ha: number, digits?: number) => number;
  /** Convert hectares → rai (no rounding). */
  haToRai: (ha: number) => number;
  /** Convert rai → hectares. */
  raiToHa: (rai: number) => number;
  /** True when locale is Thai (so the UI shows rai). */
  isThai: boolean;
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

  // Manual number formatting — identical on server and client (no Intl.NumberFormat)
  function formatNumber(n: number, opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number }): string {
    const minDigits = opts?.minimumFractionDigits ?? 0;
    const maxDigits = opts?.maximumFractionDigits ?? 3;
    const fixed = n.toFixed(Math.max(minDigits, maxDigits));
    const [intPart, decPart] = fixed.split(".");
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decPart ? `${withCommas}.${decPart}` : withCommas;
  }

  const fmt = useCallback(
    (n: number, opts?: Intl.NumberFormatOptions) =>
      formatNumber(n, {
        maximumFractionDigits: opts?.maximumFractionDigits,
        minimumFractionDigits: opts?.minimumFractionDigits,
      }),
    [locale]
  );

  // Thai month abbreviations (identical on server and client — no Intl dependency)
  const TH_MONTHS_SHORT = [
    "\u0e21\.\u0e04\.", "\u0e01\.\u0e1e\.", "\u0e21\.\u0e35\.\u0e04\.", "\u0e40\.\u0e21\.\u0e22\.",
    "\u0e1e\.\u0e05\.", "\u0e21\.\u0e34\.\u0e22\.", "\u0e01\.\u0e04\.", "\u0e2a\.\u0e04\.",
    "\u0e01\.\u0e22\.", "\u0e15\.\u0e04\.", "\u0e1e\.\u0e22\.", "\u0e18\.\u0e04\."
  ];
  const EN_MONTHS_SHORT = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const fmtDate = useCallback(
    (d: Date | string | null, _opts?: Intl.DateTimeFormatOptions) => {
      if (!d) return "\u2014";
      const date = typeof d === "string" ? new Date(d) : d;
      if (Number.isNaN(date.getTime())) return "\u2014";
      // Manual formatting — identical output on Node.js server and browser
      const day = String(date.getDate()).padStart(2, "0");
      const monthIdx = date.getMonth();
      const year = locale === "th" ? date.getFullYear() + 543 : date.getFullYear();
      const month = locale === "th" ? TH_MONTHS_SHORT[monthIdx] : EN_MONTHS_SHORT[monthIdx];
      return `${day} ${month} ${year}`;
    },
    [locale]
  );

  const fmtAreaCb = useCallback(
    (ha: number, opts?: { digits?: number; withUnit?: boolean }) =>
      fmtArea(ha, locale, opts),
    [locale]
  );
  const areaValueCb = useCallback(
    (ha: number, digits?: number) => areaValue(ha, locale, digits ?? 2),
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        fmt,
        fmtDate,
        fmtArea: fmtAreaCb,
        areaValue: areaValueCb,
        haToRai,
        raiToHa,
        isThai: locale === "th",
      }}
    >
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
      fmtArea: (ha: number) => fmtArea(ha, "th"),
      areaValue: (ha: number) => areaValue(ha, "th"),
      haToRai,
      raiToHa,
      isThai: true,
    } satisfies I18nContextValue;
  }
  return ctx;
}
