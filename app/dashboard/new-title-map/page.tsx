"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface TitleAlert {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  breeder: string;
  country: string;
  continent: string;
  sex: string;
  date_posted: string;
  photo_path: string;
  is_read: number;
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  "United States": [-98, 39], "USA": [-98, 39], "Canada": [-106, 56], "Mexico": [-102, 23],
  "Brazil": [-51, -14], "Argentina": [-64, -34], "Colombia": [-74, 4], "Chile": [-71, -35],
  "Peru": [-76, -10], "Venezuela": [-66, 7], "Ecuador": [-78, -2], "Bolivia": [-65, -17],
  "Paraguay": [-58, -23], "Uruguay": [-56, -33], "Cuba": [-79, 22], "Dominican Republic": [-70, 19],
  "Puerto Rico": [-66, 18], "Costa Rica": [-84, 10], "Panama": [-80, 9],
  "Grenada": [-61.7, 12.1], "Jamaica": [-77.3, 18.1], "Trinidad and Tobago": [-61.2, 10.5],
  "Barbados": [-59.5, 13.2], "Bahamas": [-77.4, 25], "Haiti": [-72.3, 19],
  "Honduras": [-86.2, 14.1], "Guatemala": [-90.2, 15.8], "El Salvador": [-88.9, 13.8],
  "Nicaragua": [-85.2, 12.9], "Belize": [-88.5, 17.2],
  "United Kingdom": [-3, 54], "UK": [-3, 54], "England": [-1, 52],
  "Germany": [10, 51], "France": [2, 47], "Spain": [-4, 40], "Italy": [12, 43],
  "Netherlands": [5, 52], "Belgium": [4, 51], "Portugal": [-8, 39],
  "Poland": [20, 52], "Romania": [25, 46], "Hungary": [19, 47],
  "Russia": [105, 62], "Turkey": [35, 39], "Greece": [22, 39],
  "Ireland": [-8, 53], "Sweden": [18, 62], "Norway": [8, 62],
  "Denmark": [10, 56], "Finland": [26, 64], "Switzerland": [8, 47],
  "Austria": [14, 48], "Czech Republic": [15, 50], "Croatia": [16, 45],
  "Serbia": [21, 44], "Bulgaria": [25, 43],
  "Philippines": [122, 13], "Japan": [138, 36], "China": [105, 35],
  "South Korea": [128, 36], "India": [79, 21], "Thailand": [101, 15],
  "Indonesia": [120, -5], "Vietnam": [108, 16], "Malaysia": [102, 4],
  "Australia": [134, -25], "New Zealand": [174, -41],
  "South Africa": [25, -29], "Nigeria": [8, 10], "Kenya": [38, 0],
  "Egypt": [30, 27], "Morocco": [-6, 32], "Tanzania": [35, -6],
  "Ghana": [-2, 8], "Ethiopia": [40, 9],
  "Saudi Arabia": [45, 24], "UAE": [54, 24], "Iran": [53, 33],
  "Israel": [35, 31], "Iraq": [44, 33],
};

const CONTINENT_COORDS: Record<string, [number, number]> = {
  "North America": [-98, 39], "South America": [-58, -15], "Europe": [15, 50],
  "Africa": [20, 5], "Asia": [100, 35], "Oceania": [134, -25],
  "Central America": [-85, 13], "Caribbean": [-72, 20],
};

export default function NewTitleMapPage() {
  const [alerts, setAlerts] = useState<TitleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TitleAlert | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 20]);

  useEffect(() => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    fetch(`/api/title-alerts?userId=${userId}`)
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const markRead = async (alertId: number) => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    if (!userId) return;
    await fetch("/api/title-alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, alertId }),
    });
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: 1 } : a));
  };

  const markAllRead = async () => {
    let userId = 0;
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); userId = u?.id || 0; } catch {}
    if (!userId) return;
    await fetch("/api/title-alerts/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, readAll: true }),
    });
    setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
  };

  const getCoords = (a: TitleAlert): [number, number] | null => {
    // Case-insensitive country lookup
    if (a.country) {
      const countryUpper = a.country.toUpperCase();
      for (const [key, val] of Object.entries(COUNTRY_COORDS)) {
        if (key.toUpperCase() === countryUpper) return val;
      }
    }
    // Case-insensitive continent fallback
    if (a.continent) {
      const contUpper = a.continent.toUpperCase();
      for (const [key, val] of Object.entries(CONTINENT_COORDS)) {
        if (key.toUpperCase() === contUpper) return val;
      }
    }
    return null;
  };

  const pinGroups: Record<string, { coords: [number, number]; alerts: TitleAlert[] }> = {};
  alerts.forEach(a => {
    const coords = getCoords(a);
    if (!coords) return;
    const key = coords.join(",");
    if (!pinGroups[key]) pinGroups[key] = { coords, alerts: [] };
    pinGroups[key].alerts.push(a);
  });

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest" style={{ fontFamily: "var(--font-table)", color: "#1C1C1C" }}>
              New Title World Map
            </h1>
            <p className="text-xs mt-1" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
              Dogs announced worldwide • Click a pin to see details
            </p>
          </div>
          <Link href="/dashboard/new-title-alerts" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", border: "2px solid #C9B29F", textDecoration: "none" }}>
            ← Alert List
          </Link>
        </div>

        <div className="relative" style={{ width: "100%" }}>
          {/* Map */}
          <div className="rounded-lg overflow-hidden" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px", width: "100%" }}>
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <ComposableMap
                projectionConfig={{ scale: 147, center: [0, 20] }}
                style={{ width: "100%", height: "auto", background: "#FAFAFA" }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={center}
                  onMoveEnd={({ zoom: z }) => { setZoom(z); }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filterZoomEvent={() => false}
                  translateExtent={[[0, 0], [0, 0]]}
                >
                  <Geographies geography={GEO_URL}>
                    {({ geographies }) =>
                      geographies.map((geo) => (
                        <Geography
                          key={geo.rpiKey || geo.properties?.name || Math.random()}
                          geography={geo}
                          fill="#EDE4D5"
                          stroke="#C9B29F"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { fill: "#D6CEBF", outline: "none" },
                            pressed: { outline: "none" },
                          }}
                        />
                      ))
                    }
                  </Geographies>

                  {Object.values(pinGroups).map((group, i) => (
                    <Marker key={i} coordinates={group.coords}>
                      <circle
                        r={group.alerts.length > 1 ? 8 : 6}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                        onClick={() => { markRead(group.alerts[0].id); setSelected(group.alerts[0]); }}
                      />
                      {group.alerts.length > 1 && (
                        <text textAnchor="middle" y={3} style={{ fontSize: 7, fill: "#fff", fontWeight: 700, pointerEvents: "none" }}>
                          {group.alerts.length}
                        </text>
                      )}
                    </Marker>
                  ))}
                </ZoomableGroup>
              </ComposableMap>
            )}

            {/* Zoom Controls */}
            <div style={{ position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", gap: 4, zIndex: 10 }}>
              <button
                onClick={() => setZoom(z => Math.min(z * 1.5, 8))}
                style={{ width: 32, height: 32, borderRadius: 8, border: "2px solid #C9B29F", background: "#1C1C1C", color: "#FAF7F2", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >+</button>
              <button
                onClick={() => setZoom(z => Math.max(z / 1.5, 1))}
                style={{ width: 32, height: 32, borderRadius: 8, border: "2px solid #C9B29F", background: "#1C1C1C", color: "#FAF7F2", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >−</button>
              <button
                onClick={() => { setZoom(1); setCenter([0, 20]); }}
                style={{ width: 32, height: 32, borderRadius: 8, border: "2px solid #C9B29F", background: "#FAF7F2", color: "#1C1C1C", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-table)" }}
              >↺</button>
            </div>
          </div>

          {/* Popup overlay when pin is clicked */}
          {selected && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#FAF7F2",
                border: "2px solid #C9B29F",
                borderRadius: "12px",
                width: "320px",
                maxWidth: "90vw",
                boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{ background: "#1C1C1C", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#FAF7F2", fontFamily: "var(--font-table)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Dog Details</span>
                <button onClick={() => setSelected(null)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#FAF7F2", width: 24, height: 24, borderRadius: "50%", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              {/* Content */}
              <div style={{ padding: "16px" }}>
                {selected.photo_path && (
                  <img src={selected.photo_path.startsWith("/") ? selected.photo_path : `/uploads/${selected.photo_path}`} alt={selected.name} className="w-full h-32 object-cover rounded-lg mb-3" style={{ border: "2px solid #C9B29F" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <p style={{ fontSize: "16px", fontWeight: 900, color: "#1C1C1C", fontFamily: "var(--font-table)", marginBottom: "8px" }}>
                  {selected.prefix ? selected.prefix + " " : ""}{selected.name}
                </p>
                <p style={{ fontSize: "12px", color: "#4A4A4A", fontFamily: "var(--font-table)", marginBottom: "4px" }}>
                  {selected.sex === "Male" ? "♂" : "♀"} {selected.sex}
                </p>
                {selected.breeder && (
                  <p style={{ fontSize: "12px", color: "#4A4A4A", fontFamily: "var(--font-table)", marginBottom: "4px" }}>
                    Breeder: {selected.breeder}
                  </p>
                )}
                <p style={{ fontSize: "12px", color: "#4A4A4A", fontFamily: "var(--font-table)", marginBottom: "4px" }}>
                  📍 {selected.country || "Unknown"} ({selected.continent || "Unknown"})
                </p>
                <p style={{ fontSize: "12px", color: "#4A4A4A", fontFamily: "var(--font-mono)", marginBottom: "12px" }}>
                  {new Date(selected.date_posted).toLocaleDateString()}
                </p>
                <Link
                  href={`/pedigree/custom/${selected.id}`}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px",
                    background: "#1C1C1C",
                    color: "#FAF7F2",
                    fontFamily: "var(--font-table)",
                    fontWeight: 700,
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    textAlign: "center",
                    borderRadius: "8px",
                    textDecoration: "none",
                  }}
                >
                  View Full Pedigree
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
