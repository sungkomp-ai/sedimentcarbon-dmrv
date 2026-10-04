"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip,
  useMap,
} from "react-leaflet";
import L, { type LatLngExpression, type LatLngBoundsExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  parseGeoJson,
  polygonBounds,
  type GeoJsonPolygon,
} from "@/lib/geo/geo";
import { useI18n } from "@/lib/i18n/provider";
import { STANDARD_LIST } from "@/lib/core/standards";
import { Button } from "@/components/ui/button";
import { Map, Satellite } from "lucide-react";

export interface DashboardFarm {
  id: string;
  nameTh: string;
  nameEn: string | null;
  areaHa: number;
  standard: string | null;
  sampleCount: number;
  sedimentCount: number;
  geomGeojson: string;
  soilType?: string | null;
}

interface DashboardMapProps {
  farms: DashboardFarm[];
  /** Initial tile style. */
  defaultStyle?: "streets" | "satellite";
  /** Map height in CSS units. Default "320px". */
  height?: string;
}

// Tile layer URL presets.
const TILE_LAYERS = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Imagery",
    maxZoom: 18,
  },
} as const;

type TileStyle = keyof typeof TILE_LAYERS;

/**
 * Dashboard overview map. Renders every farm polygon on a single Leaflet map
 * with a streets ↔ satellite tile toggle. Auto-fits the map to show all farms.
 */
export function DashboardMap({
  farms,
  defaultStyle = "satellite",
  height = "360px",
}: DashboardMapProps) {
  const { t, fmtArea, locale } = useI18n();
  const [style, setStyle] = useState<TileStyle>(defaultStyle);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Parse every farm's polygon (drop invalid ones silently).
  const parsedFarms = useMemo(() => {
    return farms
      .map((f) => {
        const poly = parseGeoJson<GeoJsonPolygon>(f.geomGeojson);
        if (!poly || poly.type !== "Polygon" || !poly.coordinates?.[0]) return null;
        const bounds = polygonBounds(poly);
        if (!bounds) return null;
        return { ...f, polygon: poly, bounds };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [farms]);

  // Aggregate bounds across all farms so the map shows everything.
  const aggregateBounds: [number, number, number, number] | null = useMemo(() => {
    if (parsedFarms.length === 0) return null;
    let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
    for (const f of parsedFarms) {
      const [a, b, c, d] = f.bounds;
      minLon = Math.min(minLon, a);
      minLat = Math.min(minLat, b);
      maxLon = Math.max(maxLon, c);
      maxLat = Math.max(maxLat, d);
    }
    return [minLon, minLat, maxLon, maxLat];
  }, [parsedFarms]);

  // Default center: Thai Northeast (Nakhon Ratchasima) if no farms.
  const center: LatLngExpression = aggregateBounds
    ? [
        (aggregateBounds[1] + aggregateBounds[3]) / 2,
        (aggregateBounds[0] + aggregateBounds[2]) / 2,
      ]
    : [14.98, 102.11];
  const zoom = aggregateBounds ? 13 : 6;

  // Convert GeoJSON ring [lon, lat] to Leaflet [lat, lon]
  const toLatLng = (ring: number[][]) =>
    ring.map(([lon, lat]) => [lat, lon] as [number, number]);

  const isThai = locale === "th";
  const tileLabel = isThai
    ? style === "satellite"
      ? "ภาพถนน"
      : "ภาพดาวเทียม"
    : style === "satellite"
    ? "Streets"
    : "Satellite";

  if (!mounted) {
    return (
      <div
        className="w-full overflow-hidden rounded-md border bg-muted/40 animate-pulse"
        style={{ height }}
      />
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full"
        style={{ height, zIndex: 0 }}
        scrollWheelZoom
      >
        <TileLayer
          key={style}
          url={TILE_LAYERS[style].url}
          attribution={TILE_LAYERS[style].attribution}
          maxZoom={TILE_LAYERS[style].maxZoom}
        />

        {parsedFarms.map((f) => {
          const rule = STANDARD_LIST.find((s) => s.code === f.standard);
          const color = rule?.accent ?? "#16a34a";
          const positions: LatLngExpression[] = toLatLng(f.polygon.coordinates[0]);
          return (
            <Polygon
              key={f.id}
              positions={positions}
              pathOptions={{
                color,
                weight: 2.5,
                fillColor: color,
                fillOpacity: 0.35,
              }}
            >
              <Tooltip sticky direction="top">
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">
                    {isThai ? f.nameTh : f.nameEn ?? f.nameTh}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {f.standard ?? "—"} · {fmtArea(f.areaHa, { digits: 2 })}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {isThai ? "ตัวอย่างดิน" : "Samples"}: {f.sampleCount} ·{" "}
                    {isThai ? "ตะกอน" : "Sediment"}: {f.sedimentCount}
                  </div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        <FitBounds bounds={aggregateBounds} />
      </MapContainer>

      {/* Tile toggle */}
      <div className="absolute right-2 top-2 z-[1000] flex items-center gap-1 rounded-md bg-background/90 p-1 shadow-sm backdrop-blur">
        <Button
          variant={style === "satellite" ? "default" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => setStyle("satellite")}
          aria-pressed={style === "satellite"}
        >
          <Satellite className="h-3.5 w-3.5" />
          <span className="text-xs">{isThai ? "ดาวเทียม" : "Satellite"}</span>
        </Button>
        <Button
          variant={style === "streets" ? "default" : "ghost"}
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          onClick={() => setStyle("streets")}
          aria-pressed={style === "streets"}
        >
          <Map className="h-3.5 w-3.5" />
          <span className="text-xs">{isThai ? "ถนน" : "Streets"}</span>
        </Button>
      </div>

      {/* Empty state */}
      {parsedFarms.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="rounded-md bg-background/80 px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            {isThai ? "ยังไม่มีแปลงในระบบ" : "No farms registered"}
          </p>
        </div>
      )}
    </div>
  );
}

/** Auto-fit the map to show all farm polygons. */
function FitBounds({
  bounds,
}: {
  bounds: [number, number, number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const leafletBounds: LatLngBoundsExpression = [
      [minLat, minLon],
      [maxLat, maxLon],
    ];
    map.fitBounds(leafletBounds, { padding: [30, 30], maxZoom: 15 });
  }, [bounds, map]);
  return null;
}
