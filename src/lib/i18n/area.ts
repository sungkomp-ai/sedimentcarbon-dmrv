/**
 * Area unit conversions for Thai context.
 * 1 ha = 6.25 rai, 1 rai = 1600 m² = 0.16 ha.
 *
 * Calculations stay in ha (the PDF/standard unit) — only display is converted.
 */
import type { Locale } from "./translations";

export const HA_TO_RAI = 6.25;
export const RAI_TO_HA = 1 / 6.25;

/** Convert hectares → rai (display only). */
export function haToRai(ha: number): number {
  return ha * HA_TO_RAI;
}

/** Convert rai → hectares (when user inputs in rai). */
export function raiToHa(rai: number): number {
  return rai * RAI_TO_HA;
}

/** Localised unit label for area. */
export function areaUnitLabel(locale: Locale): string {
  return locale === "th" ? "ไร่" : "ha";
}

/**
 * Format a hectare area in the locale-appropriate unit.
 * TH: shows rai with 2 decimals (e.g. 312.50 ไร่)
 * EN: shows ha with 2 decimals (e.g. 50.00 ha)
 */
export function fmtArea(
  ha: number,
  locale: Locale,
  opts?: { digits?: number; withUnit?: boolean }
): string {
  const digits = opts?.digits ?? 2;
  const withUnit = opts?.withUnit ?? true;
  if (locale === "th") {
    const rai = haToRai(ha);
    const num = new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(rai);
    return withUnit ? `${num} ไร่` : num;
  }
  const num = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(ha);
  return withUnit ? `${num} ha` : num;
}

/** Numeric area value (no unit), already converted for the locale. */
export function areaValue(ha: number, locale: Locale, digits = 2): number {
  const v = locale === "th" ? haToRai(ha) : ha;
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
