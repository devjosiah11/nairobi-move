import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { ROUTES } from "../lib/data";

// ─── Types ────────────────────────────────────────────────────────────────────

type TrafficLevel = "low" | "moderate" | "heavy" | "severe";

type StageData = {
  id: string; name: string; area: string;
  lat: number; lng: number;
  traffic_level: TrafficLevel; congestion_score: number;
  route_count: number;
  available_routes: { route_number: string; name: string; peak_min: number; peak_max: number }[];
};

type IncidentData = {
  id: string; lat: number; lng: number;
  type: "accident" | "congestion" | "police" | "flood" | "roadworks";
  description: string; reported_at: string; time_ago: string;
};

type MapData = {
  stages: StageData[];
  incidents: IncidentData[];
  traffic_summary: { overall_level: string; is_peak: boolean; peak_label: string; updated_at: string };
};

// ─── Route definition ─────────────────────────────────────────────────────────

const searchSchema = z.object({
  from: z.string().optional().catch(undefined),
  to:   z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/map")({
  validateSearch: searchSchema,
  component: MapPage,
});

// ─── Constants ────────────────────────────────────────────────────────────────

const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 };

const INCIDENT_EMOJI: Record<string, string> = {
  accident: "🚗", congestion: "🚦", police: "🚔", flood: "🌊", roadworks: "🚧",
};
const INCIDENT_COLOR: Record<string, string> = {
  accident: "#EF4444", congestion: "#F97316", police: "#3B82F6", flood: "#06B6D4", roadworks: "#8B5CF6",
};
const TRAFFIC_PIN: Record<TrafficLevel, string> = {
  low: "#22C55E", moderate: "#F59E0B", heavy: "#F97316", severe: "#EF4444",
};

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;

// ─── Data hook ────────────────────────────────────────────────────────────────

function useMapData() {
  const [data, setData] = useState<MapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedNow, setUpdatedNow] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const r = await fetch("/api/traffic/map-data");
      const d = await r.json();
      setData(d);
      if (silent) { setUpdatedNow(true); setTimeout(() => setUpdatedNow(false), 3000); }
    } catch (_) {}
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(false);
    const id = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  return { data, loading, updatedNow };
}

// ─── TrafficLayer ─────────────────────────────────────────────────────────────

function TrafficLayer() {
  const map = useMap();
  useEffect(() => {
    if (!map || !(window as any).google) return;
    const layer = new (window as any).google.maps.TrafficLayer();
    layer.setMap(map);
    return () => layer.setMap(null);
  }, [map]);
  return null;
}

// ─── Route polylines ──────────────────────────────────────────────────────────

type PolylineProps = { origin: {lat:number;lng:number}; dest: {lat:number;lng:number}; color: string; weight?: number; opacity?: number; onClick?: () => void };

function RouteLine({ origin, dest, color, weight = 4, opacity = 0.7, onClick }: PolylineProps) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  useEffect(() => {
    if (!map || !mapsLib) return;
    const poly = new mapsLib.Polyline({
      path: [origin, dest], strokeColor: color,
      strokeWeight: weight, strokeOpacity: opacity, map,
    });
    if (onClick) poly.addListener("click", onClick);
    return () => { poly.setMap(null); };
  }, [map, mapsLib, origin, dest, color, weight, opacity, onClick]);
  return null;
}

function RoutePolylines({ stages, highlight, from, to }: { stages: StageData[]; highlight?: boolean; from?: string; to?: string }) {
  const [info, setInfo] = useState<{ pos: {lat:number;lng:number}; text: string } | null>(null);
  const stageMap = Object.fromEntries(stages.map(s => [s.name.toLowerCase(), s]));

  return (
    <>
      {ROUTES.map((r) => {
        const o = stages.find(s => s.name.toLowerCase().includes(r.from.toLowerCase()) || r.from.toLowerCase().includes(s.name.toLowerCase()));
        const d = stages.find(s => s.name.toLowerCase().includes(r.to.toLowerCase())   || r.to.toLowerCase().includes(s.name.toLowerCase()));
        if (!o || !d) return null;

        const isHighlight = highlight && from && to &&
          (o.name.toLowerCase().includes(from.toLowerCase()) || d.name.toLowerCase().includes(to.toLowerCase()));

        const color = isHighlight ? "#2563EB" : TRAFFIC_PIN[o.traffic_level ?? "low"];
        const weight = isHighlight ? 6 : 4;
        const midLat = (o.lat + d.lat) / 2;
        const midLng = (o.lng + d.lng) / 2;

        return (
          <RouteLine
            key={r.id}
            origin={{ lat: o.lat, lng: o.lng }}
            dest={{ lat: d.lat, lng: d.lng }}
            color={color} weight={weight} opacity={isHighlight ? 0.9 : 0.65}
            onClick={() => setInfo({ pos: { lat: midLat, lng: midLng }, text: `Route ${r.number} — ${r.sacco}\nKES ${r.farePeak[0]}–${r.farePeak[1]} peak` })}
          />
        );
      })}
      {info && (
        <InfoWindow position={info.pos} onCloseClick={() => setInfo(null)}>
          <div className="text-sm font-semibold whitespace-pre-line">{info.text}</div>
        </InfoWindow>
      )}
    </>
  );
}

// ─── Stage marker ─────────────────────────────────────────────────────────────

function StageMarker({ stage }: { stage: StageData }) {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<any>(null);
  const bg = TRAFFIC_PIN[stage.traffic_level];
  const isSevere = stage.traffic_level === "severe";

  return (
    <>
      <AdvancedMarker
        position={{ lat: stage.lat, lng: stage.lng }}
        ref={markerRef}
        onClick={() => setOpen(true)}
        title={stage.name}
      >
        <div style={{ position: "relative" }}>
          {isSevere && (
            <div style={{
              position: "absolute", inset: "-4px", borderRadius: "50%",
              background: bg, opacity: 0.35,
              animation: "pulse 1.4s cubic-bezier(0.4,0,0.6,1) infinite",
            }} />
          )}
          <Pin background={bg} borderColor="#fff" glyphColor="#fff" scale={stage.route_count > 2 ? 1.2 : 1}>
            <span style={{ fontSize: 14 }}>🚌</span>
          </Pin>
        </div>
      </AdvancedMarker>

      {open && markerRef.current && (
        <InfoWindow anchor={markerRef.current} onCloseClick={() => setOpen(false)}>
          <div style={{ minWidth: 200, maxWidth: 260, fontFamily: "sans-serif" }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{stage.name}</div>
            <span style={{
              display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.05em", padding: "2px 8px", borderRadius: 99,
              background: bg + "22", color: bg, marginBottom: 8,
            }}>
              {stage.traffic_level} traffic
            </span>

            {/* Congestion bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>
                Congestion: {stage.congestion_score}/10
              </div>
              <div style={{ height: 6, background: "#eee", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${stage.congestion_score * 10}%`, background: bg, borderRadius: 99 }} />
              </div>
            </div>

            {/* Routes */}
            {stage.available_routes.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {stage.available_routes.map(r => (
                  <div key={r.route_number} style={{ fontSize: 12, padding: "2px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontWeight: 700 }}>Route {r.route_number}</span> — KES {r.peak_min}–{r.peak_max}
                  </div>
                ))}
              </div>
            )}

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${stage.lat},${stage.lng}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: "block", textAlign: "center", background: "#2563EB", color: "#fff", borderRadius: 8, padding: "6px 0", fontSize: 12, fontWeight: 700, textDecoration: "none" }}
            >
              Get directions →
            </a>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ─── Incident marker ──────────────────────────────────────────────────────────

function IncidentMarker({ incident, onResolve }: { incident: IncidentData; onResolve: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const markerRef = useRef<any>(null);
  const emoji = INCIDENT_EMOJI[incident.type] ?? "⚠️";
  const color = INCIDENT_COLOR[incident.type] ?? "#888";

  return (
    <>
      <AdvancedMarker
        position={{ lat: incident.lat, lng: incident.lng }}
        ref={markerRef}
        onClick={() => setOpen(true)}
      >
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "#fff", border: `2.5px solid ${color}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, boxShadow: "0 2px 8px rgba(0,0,0,0.18)", cursor: "pointer",
        }}>
          {emoji}
        </div>
      </AdvancedMarker>

      {open && markerRef.current && (
        <InfoWindow anchor={markerRef.current} onCloseClick={() => setOpen(false)}>
          <div style={{ minWidth: 210, maxWidth: 260, fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{emoji}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, textTransform: "capitalize", letterSpacing: "0.04em",
                padding: "2px 8px", borderRadius: 99, background: color + "22", color,
              }}>{incident.type}</span>
            </div>
            <p style={{ fontSize: 13, margin: "0 0 6px", lineHeight: 1.4 }}>{incident.description}</p>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>Reported {incident.time_ago}</div>
            <button
              onClick={async () => {
                await fetch(`/api/traffic/incidents/${incident.id}`, { method: "DELETE" });
                onResolve(incident.id);
                setOpen(false);
              }}
              style={{
                width: "100%", padding: "6px 0", borderRadius: 8, border: "1px solid #e5e7eb",
                background: "#f9fafb", fontSize: 12, cursor: "pointer", fontWeight: 600,
              }}
            >
              ✅ This is now resolved
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ─── Report Incident modal ────────────────────────────────────────────────────

const INCIDENT_TYPES = [
  { key: "accident",   label: "Accident",    emoji: "🚗" },
  { key: "congestion", label: "Congestion",  emoji: "🚦" },
  { key: "police",     label: "Police check",emoji: "🚔" },
  { key: "roadworks",  label: "Roadworks",   emoji: "🚧" },
  { key: "flood",      label: "Flooding",    emoji: "🌊" },
];

function MapClickCapture({ active, onCapture }: { active: boolean; onCapture: (pos: {lat:number;lng:number}) => void }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !active) return;
    const listener = (window as any).google?.maps?.event.addListener(map, "click", (e: any) => {
      if (e.latLng) onCapture({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
    return () => { if (listener) (window as any).google?.maps?.event.removeListener(listener); };
  }, [map, active, onCapture]);
  return null;
}

function FitBounds({ from, to, stages }: { from?: string; to?: string; stages: StageData[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (!map || !from || !to || stages.length === 0 || done.current) return;
    const o = stages.find(s => s.name.toLowerCase().includes(from.toLowerCase()));
    const d = stages.find(s => s.name.toLowerCase().includes(to.toLowerCase()));
    if (!o || !d) return;
    done.current = true;
    const bounds = new (window as any).google.maps.LatLngBounds();
    bounds.extend({ lat: o.lat, lng: o.lng });
    bounds.extend({ lat: d.lat, lng: d.lng });
    map.fitBounds(bounds, 80);
  }, [map, from, to, stages]);
  return null;
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{
      position: "absolute", bottom: 90, left: 12, zIndex: 10,
      background: "#fff", borderRadius: 14, padding: "12px 14px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.13)", fontSize: 12, lineHeight: 1.8, maxWidth: 195,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>NairobiMove Live Map</div>
      <div style={{ fontWeight: 600, color: "#555", marginBottom: 2 }}>🚌 Stage traffic</div>
      <div>🟢 Low &nbsp;&nbsp; 🟡 Moderate</div>
      <div>🟠 Heavy &nbsp; 🔴 Severe</div>
      <div style={{ fontWeight: 600, color: "#555", margin: "6px 0 2px" }}>📍 Incidents</div>
      <div>🚗 Accident &nbsp; 🚦 Congestion</div>
      <div>🚔 Police &nbsp;&nbsp; 🚧 Roadworks</div>
      <div style={{ color: "#888", fontSize: 10, marginTop: 6, borderTop: "1px solid #f0f0f0", paddingTop: 4 }}>
        Real traffic by Google Maps
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function MapPage() {
  const { from, to } = Route.useSearch();
  const navigate = useNavigate();
  const { data, loading, updatedNow } = useMapData();

  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [pendingPin, setPendingPin] = useState<{lat:number;lng:number} | null>(null);
  const [incidentType, setIncidentType] = useState("congestion");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (data) setIncidents(data.incidents);
  }, [data]);

  const resolveIncident = useCallback((id: string) => {
    setIncidents(prev => prev.filter(i => i.id !== id));
  }, []);

  const useCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setPendingPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("Location access denied"),
    );
  };

  const submitReport = async () => {
    if (!pendingPin) return alert("Tap the map or use your location to place a pin first.");
    setSubmitting(true);
    try {
      const r = await fetch("/api/traffic/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: pendingPin.lat, lng: pendingPin.lng, type: incidentType, description: incidentDesc }),
      });
      const body = await r.json();
      if (body.success) {
        setIncidents(prev => [body.incident, ...prev]);
        setReportOpen(false);
        setPendingPin(null);
        setIncidentDesc("");
      }
    } catch (_) {}
    setSubmitting(false);
  };

  const stages = data?.stages ?? [];
  const summary = data?.traffic_summary;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Header strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 20,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e5e7eb", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button
          onClick={() => navigate({ to: "/" })}
          style={{ background: "none", border: "none", fontWeight: 700, fontSize: 13, color: "#2563EB", cursor: "pointer" }}
        >
          ← Back
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>NairobiMove Live Map</div>
          {summary && (
            <div style={{ fontSize: 11, color: "#888" }}>
              {summary.peak_label} · {summary.overall_level} traffic
            </div>
          )}
        </div>
        <div style={{ width: 52, textAlign: "right" }}>
          {updatedNow && (
            <span style={{
              fontSize: 10, background: "#D1FAE5", color: "#065F46",
              borderRadius: 99, padding: "2px 7px", fontWeight: 600,
            }}>
              Updated ✓
            </span>
          )}
        </div>
      </div>

      {/* Map */}
      <APIProvider apiKey={GMAPS_KEY}>
        <Map
          defaultCenter={NAIROBI_CENTER}
          defaultZoom={12}
          mapId="nairobi-move-map"
          style={{ flex: 1 }}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          <TrafficLayer />

          {/* Stage markers */}
          {stages.map(s => <StageMarker key={s.id} stage={s} />)}

          {/* Incident markers */}
          {incidents.map(i => <IncidentMarker key={i.id} incident={i} onResolve={resolveIncident} />)}

          {/* Pending pin (report modal) */}
          {pendingPin && (
            <AdvancedMarker position={pendingPin}>
              <div style={{ fontSize: 28, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>📍</div>
            </AdvancedMarker>
          )}

          {/* Route polylines */}
          {stages.length > 0 && (
            <RoutePolylines stages={stages} highlight={!!(from && to)} from={from} to={to} />
          )}

          {/* FitBounds when from/to present */}
          {stages.length > 0 && <FitBounds from={from} to={to} stages={stages} />}

          {/* Map click capture (only when modal open) */}
          <MapClickCapture active={reportOpen && !pendingPin} onCapture={setPendingPin} />
        </Map>

        {/* Legend */}
        <Legend />

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 30,
            background: "rgba(255,255,255,0.7)", backdropFilter: "blur(4px)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, border: "3px solid #e5e7eb", borderTopColor: "#2563EB",
              borderRadius: "50%", animation: "spin 0.7s linear infinite",
            }} />
            <div style={{ fontWeight: 600, color: "#374151", fontSize: 14 }}>Loading live transport data…</div>
          </div>
        )}

        {/* Report FAB */}
        <button
          onClick={() => setReportOpen(true)}
          style={{
            position: "absolute", bottom: 96, right: 16, zIndex: 20,
            width: 56, height: 56, borderRadius: "50%",
            background: "#EF4444", color: "#fff", border: "none",
            fontSize: 24, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(239,68,68,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
          }}
          title="Report incident"
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>+</span>
          <span style={{ fontSize: 8, fontWeight: 700 }}>REPORT</span>
        </button>
      </APIProvider>

      {/* Report Modal */}
      {reportOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
        }}>
          <div style={{
            background: "#fff", borderRadius: "20px 20px 0 0", padding: 20,
            width: "100%", maxWidth: 540, maxHeight: "85dvh", overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Report a transport incident</div>
              <button onClick={() => { setReportOpen(false); setPendingPin(null); }} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>

            <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 14 }}>
              {pendingPin ? "📍 Pin placed. Choose type and submit." : "Tap the map to place a pin, or use your current location."}
            </p>

            <button
              onClick={useCurrentLocation}
              style={{
                width: "100%", padding: "10px 0", borderRadius: 10, border: "1.5px solid #2563EB",
                color: "#2563EB", background: "#EFF6FF", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 14,
              }}
            >
              📍 Use my location
            </button>

            {/* Incident type */}
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Incident type</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
              {INCIDENT_TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setIncidentType(t.key)}
                  style={{
                    padding: "10px 8px", borderRadius: 10, border: `2px solid ${incidentType === t.key ? "#2563EB" : "#e5e7eb"}`,
                    background: incidentType === t.key ? "#EFF6FF" : "#f9fafb",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.emoji}</span> {t.label}
                </button>
              ))}
            </div>

            {/* Description */}
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Details (optional)</div>
            <textarea
              value={incidentDesc}
              onChange={e => setIncidentDesc(e.target.value)}
              placeholder="e.g. 'Both lanes blocked near Total petrol station'"
              rows={3}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 10,
                border: "1.5px solid #e5e7eb", fontSize: 13, resize: "none",
                marginBottom: 14, boxSizing: "border-box",
              }}
            />

            <button
              onClick={submitReport}
              disabled={submitting}
              style={{
                width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: submitting ? "#9CA3AF" : "#EF4444", color: "#fff",
                fontWeight: 700, fontSize: 15, cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Reporting…" : "Report Incident"}
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
      `}</style>
    </div>
  );
}
