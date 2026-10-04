"use client";

import dynamic from "next/dynamic";
import { useI18n } from "@/lib/i18n/provider";

// Leaflet accesses `window` at module load time, so we load the map
// component only on the client via next/dynamic with ssr: false.
const LeafletMap = dynamic(
  () => import("./leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted/40 animate-pulse" />
    ),
  }
);

interface MiniMapProps {
  value: string; // GeoJSON string
  onChange: (v: string) => void;
  className?: string;
  editable?: boolean;
  style?: "streets" | "satellite" | "topo";
}

/**
 * Backwards-compatible wrapper around the real Leaflet map. Keeps the same
 * prop surface as the previous SVG-only MiniMap so callers (Farm cards, farm
 * form dialog) don't need to change.
 *
 * Area units shown in the HUD are locale-aware: rai for TH, ha for EN.
 */
export function MiniMap({
  value,
  onChange,
  className,
  editable = true,
  style,
}: MiniMapProps) {
  const { locale } = useI18n();
  return (
    <LeafletMap
      value={value}
      onChange={onChange}
      className={className}
      editable={editable}
      style={style ?? (locale === "th" ? "topo" : "streets")}
    />
  );
}
