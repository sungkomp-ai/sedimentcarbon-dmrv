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
      // Use Gregorian calendar for both server and client (consistent SSR).
      // For Thai locale, manually add 543 to the year to get Buddhist Era.
      const formatted = new Intl.DateTimeFormat(
        locale === "th" ? "th-TH" : "en-US",
        { ...defaultOpts, calendar: "gregory" }
      ).format(date);
      if (locale === "th" && defaultOpts.year) {
        // Replace the Gregorian year with Buddhist Era year (+543)
        const beYear = date.getFullYear() + 543;
        return formatted.replace(
          String(date.getFullYear()),
          String(beYear)
        );
      }
      return formatted;
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
