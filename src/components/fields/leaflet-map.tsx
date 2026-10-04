"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  CircleMarker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  polygonBounds,
  polygonAreaHa,
  buildPolygon,
  type GeoJsonPolygon,
} from "@/lib/geo/geo";
import { useI18n } from "@/lib/i18n/provider";

// Fix default marker icon path (Leaflet looks for marker-icon.png in /assets).
// We don't actually use markers here, but the import prevents 404 noise.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

(L.Icon.Default.mergeOptions as (opts: Record<string, unknown>) => void)({
  iconRetinaUrl: markerIcon2x as unknown as string,
  iconUrl: markerIcon as unknown as string,
  shadowUrl: markerShadow as unknown as string,
});

interface LeafletMapProps {
  /** GeoJSON Polygon string */
  value: string;
  onChange: (v: string) => void;
  className?: string;
  editable?: boolean;
  /** Optional map style: 'streets' (default), 'satellite', 'topo' */
  style?: "streets" | "satellite" | "topo";
}

// Tile layer URL presets. All use OSM-compatible tile servers.
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
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap (CC-BY-SA)",
    maxZoom: 17,
  },
};

export function LeafletMap({
  value,
  onChange,
  className,
  editable = true,
  style = "streets",
}: LeafletMapProps) {
  const { fmtArea, locale } = useI18n();
  const [mounted, setMounted] = useState(false);
  // Draft points when user clicks the map to add vertices. If null, we derive
  // directly from the parsed value.
  const [draft, setDraft] = useState<[number, number][] | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Parse current polygon from value (re-derived each render — cheap)
  const polygon: GeoJsonPolygon | null = (() => {
    try {
      const p = JSON.parse(value) as GeoJsonPolygon;
      if (p && p.type === "Polygon") return p;
    } catch {
      /* ignore */
    }
    return null;
  })();

  // Derive drawing points from value (closed-ring polygon). Drop the closing
  // vertex so the user doesn't see a duplicate dot at the start point.
  const parsedPoints: [number, number][] = polygon?.coordinates?.[0]
    ? (polygon.coordinates[0].slice(0, -1) as [number, number][])
    : [];
  // Use draft if the user has interacted, else fall back to the parsed points.
  const drawingPoints = draft ?? parsedPoints;

  const area = polygon ? polygonAreaHa(polygon) : 0;

  if (!mounted) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted/40 animate-pulse" />
    );
  }

  // Compute initial map view from polygon centroid or default to Thai NE region
  const bounds = polygon ? polygonBounds(polygon) : null;
  const center: LatLngExpression = bounds
    ? [(bounds[1] + bounds[3]) / 2, (bounds[0] + bounds[2]) / 2]
    : [14.98, 102.11];
  const zoom = bounds ? 14 : 6;

  // Convert GeoJSON ring [lon, lat] to Leaflet [lat, lon]
  const ringToLatLng = (ring: number[][]) =>
    ring.map(([lon, lat]) => [lat, lon] as [number, number]);

  const polygonPositions: LatLngExpression[] = polygon
    ? ringToLatLng(polygon.coordinates[0])
    : drawingPoints.map(([lon, lat]) => [lat, lon]);

  return (
    <div className={className}>
      <div className="relative aspect-video w-full overflow-hidden rounded-md border">
        <MapContainer
          center={center}
          zoom={zoom}
          className="absolute inset-0 h-full w-full z-0"
          scrollWheelZoom={editable}
          doubleClickZoom={false}
        >
          <TileLayer
            url={TILE_LAYERS[style].url}
            attribution={TILE_LAYERS[style].attribution}
            maxZoom={TILE_LAYERS[style].maxZoom}
          />

          {polygonPositions.length >= 2 && (
            <Polygon
              positions={polygonPositions}
              pathOptions={{
                color: "#16a34a",
                weight: 2.5,
                fillColor: "#16a34a",
                fillOpacity: 0.2,
              }}
            >
              <Tooltip sticky>{fmtArea(area)}</Tooltip>
            </Polygon>
          )}

          {editable && (
            <>
              {drawingPoints.length > 0 && (
                <Polyline
                  positions={drawingPoints.map(([lon, lat]) => [lat, lon])}
                  pathOptions={{
                    color: "#16a34a",
                    weight: 1.5,
                    dashArray: "6 6",
                  }}
                />
              )}
              {drawingPoints.map(([lon, lat], i) => (
                <CircleMarker
                  key={i}
                  center={[lat, lon]}
                  radius={5}
                  pathOptions={{
                    color: "white",
                    weight: 2,
                    fillColor: "#16a34a",
                    fillOpacity: 1,
                  }}
                >
                  <Tooltip>#{i + 1}</Tooltip>
                </CircleMarker>
              ))}
              <MapClickHandler
                onAdd={(lat, lon) => {
                  const next = [...drawingPoints, [lon, lat] as [number, number]];
                  setDraft(next);
                  onChange(JSON.stringify(buildPolygon(next)));
                }}
                onClear={() => {
                  setDraft([]);
                  onChange("");
                }}
              />
              <FitBounds bounds={bounds} />
            </>
          )}

          {!editable && bounds && <FitBounds bounds={bounds} />}
        </MapContainer>

        {/* HUD: area + vertex count */}
        <div className="absolute left-2 top-2 z-[1000] flex items-center gap-2 rounded-md bg-background/85 px-2 py-1 text-xs shadow-sm backdrop-blur">
          <span className="font-semibold tabular-nums">{fmtArea(area)}</span>
          {drawingPoints.length > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground tabular-nums">
                {drawingPoints.length} pts
              </span>
            </>
          )}
        </div>
        {editable && (
          <div className="absolute bottom-2 right-2 z-[1000] rounded-md bg-background/85 px-2 py-1 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
            {locale === "th"
              ? "คลิกเพื่อเพิ่มจุด · ดับเบิ้ลคลิกเพื่อล้าง"
              : "Click to add vertex · Double-click to clear"}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Click handler that adds vertices on click and clears on double-click.
 */
function MapClickHandler({
  onAdd,
  onClear,
}: {
  onAdd: (lat: number, lon: number) => void;
  onClear: () => void;
}) {
  const map = useMapEvents({
    click(e) {
      onAdd(e.latlng.lat, e.latlng.lng);
    },
    dblclick() {
      onClear();
    },
  });
  // Disable the default double-click zoom so clearing doesn't also zoom in
  if (map.options.doubleClickZoom) {
    map.doubleClickZoom.disable();
  }
  return null;
}

/** Auto-fit the map to the polygon bounds whenever it changes. */
function FitBounds({
  bounds,
}: {
  bounds: [number, number, number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const leafletBounds = L.latLngBounds(
      [minLat, minLon] as LatLngExpression,
      [maxLat, maxLon] as LatLngExpression
    );
    map.fitBounds(leafletBounds, { padding: [20, 20], maxZoom: 16 });
  }, [bounds, map]);
  return null;
}
