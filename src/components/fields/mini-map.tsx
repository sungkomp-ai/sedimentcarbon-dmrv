"use client";

import { useMemo, useState } from "react";
import {
  polygonBounds,
  polygonToSvg,
  buildPolygon,
  polygonAreaHa,
  DEFAULT_VIEW_BBOX,
  type GeoJsonPolygon,
} from "@/lib/geo/geo";

interface MiniMapProps {
  value: string; // GeoJSON string
  onChange: (v: string) => void;
  className?: string;
  editable?: boolean;
}

/**
 * Lightweight SVG map for plotting a single farm polygon. Click to add a vertex
 * (shift-click to clear). Replaces MapLibre/Leaflet for the demo - no external
 * tile dependency, always renders, fully offline.
 */
export function MiniMap({ value, onChange, className, editable = true }: MiniMapProps) {
  const polygon: GeoJsonPolygon | null = useMemo(() => {
    try {
      const parsed = JSON.parse(value) as GeoJsonPolygon;
      if (parsed && parsed.type === "Polygon") return parsed;
    } catch {
      /* ignore */
    }
    return null;
  }, [value]);

  const bounds = useMemo(() => {
    if (polygon) {
      const b = polygonBounds(polygon);
      if (b) return b;
    }
    return DEFAULT_VIEW_BBOX;
  }, [polygon]);

  // Derive drawing points directly from the parsed polygon. We keep a local
  // copy in state ONLY so that user clicks can mutate before re-serializing.
  const parsedPoints: [number, number][] = useMemo(() => {
    if (polygon && polygon.coordinates?.[0]) {
      // drop closing point
      return polygon.coordinates[0].slice(0, -1) as [number, number][];
    }
    return [];
  }, [polygon]);
  const [draftPoints, setDraftPoints] = useState<[number, number][] | null>(null);
  const drawingPoints = draftPoints ?? parsedPoints;

  const svgPoints = polygon ? polygonToSvg(polygon, bounds) : "";
  const area = polygon ? polygonAreaHa(polygon) : 0;

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!editable) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    // Convert back to lon/lat
    const [minLon, minLat, maxLon, maxLat] = bounds;
    const lon = minLon + x * (maxLon - minLon);
    const lat = maxLat - y * (maxLat - minLat);
    if (e.shiftKey) {
      setDraftPoints([]);
      onChange("");
      return;
    }
    const next = [...drawingPoints, [lon, lat] as [number, number]];
    setDraftPoints(next);
    onChange(JSON.stringify(buildPolygon(next)));
  }

  // Compute SVG path for drawing points
  const draftSvg = drawingPoints
    .map(([lon, lat]) => {
      const x = (lon - bounds[0]) / (bounds[2] - bounds[0]);
      const y = 1 - (lat - bounds[1]) / (bounds[3] - bounds[1]);
      return `${x.toFixed(4)},${y.toFixed(4)}`;
    })
    .join(" ");

  return (
    <div className={className}>
      <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-emerald-50/40 dark:bg-emerald-950/20">
        <svg
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          onClick={handleSvgClick}
          role={editable ? "button" : "img"}
          aria-label="Farm boundary map"
        >
          {/* Decorative grid */}
          <defs>
            <pattern id="grid" width="0.1" height="0.1" patternUnits="objectBoundingBox">
              <path d="M 0.1 0 L 0 0 0 0.1" fill="none" stroke="currentColor" strokeWidth="0.005" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="1" height="1" fill="url(#grid)" />

          {/* Polygon */}
          {svgPoints && (
            <polygon
              points={svgPoints}
              fill="rgba(22, 163, 74, 0.25)"
              stroke="#16a34a"
              strokeWidth="0.008"
              strokeLinejoin="round"
            />
          )}

          {/* Drafting points */}
          {drawingPoints.length > 0 && (
            <polyline
              points={draftSvg}
              fill={drawingPoints.length >= 3 ? "rgba(22, 163, 74, 0.15)" : "none"}
              stroke="#16a34a"
              strokeWidth="0.008"
              strokeDasharray="0.01 0.01"
            />
          )}
          {drawingPoints.map((_, i) => {
            const pt = draftSvg.split(" ")[i];
            if (!pt) return null;
            const [x, y] = pt.split(",").map(Number);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="0.012"
                fill="#16a34a"
                stroke="white"
                strokeWidth="0.004"
              />
            );
          })}
        </svg>

        {/* HUD */}
        <div className="absolute left-2 top-2 flex items-center gap-2 rounded-md bg-background/80 px-2 py-1 text-xs backdrop-blur">
          <span className="font-medium tabular-nums">{area.toFixed(2)} ha</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground tabular-nums">
            {drawingPoints.length} pts
          </span>
        </div>
        {editable && (
          <div className="absolute bottom-2 right-2 rounded-md bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur">
            Click to add vertex · Shift-click to clear
          </div>
        )}
      </div>
    </div>
  );
}
