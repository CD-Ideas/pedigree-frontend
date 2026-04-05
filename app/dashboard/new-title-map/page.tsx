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
    if (a.country && COUNTRY_COORDS[a.country]) return COUNTRY_COORDS[a.country];
    if (a.continent && CONTINENT_COORDS[a.continent]) return CONTINENT_COORDS[a.continent];
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
      <div className="max-w-7xl mx-auto px-4 py-6">
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

        <div className="flex gap-4">
          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px" }}>
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <ComposableMap
                projectionConfig={{ scale: 147, center: [0, 20] }}
                style={{ width: "100%", height: "auto", background: "#FAFAFA" }}
              >
                <ZoomableGroup>
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
                        r={group.alerts.length > 1 ? 6 : 4}
                        fill="#ef4444"
                        stroke="#fff"
                        strokeWidth={1.5}
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelected(group.alerts[0])}
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
          </div>

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px", maxHeight: "600px" }}>
            <div style={{ background: "#1C1C1C", padding: "12px 16px" }} className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
                {selected ? "Dog Details" : `All Alerts (${alerts.length})`}
              </p>
              {!selected && alerts.some(a => !a.is_read) && (
                <button onClick={markAllRead} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all hover:opacity-80" style={{ background: "#C9B29F", color: "#1C1C1C", fontFamily: "var(--font-table)", border: "none", cursor: "pointer" }}>
                  Mark all read
                </button>
              )}
            </div>
            <div style={{ overflow: "auto", maxHeight: "550px" }}>
              {selected ? (
                <div className="p-4 space-y-3">
                  <button onClick={() => setSelected(null)} className="text-xs font-bold" style={{ color: "#1d5bbf", fontFamily: "var(--font-table)", background: "none", border: "none", cursor: "pointer" }}>← Back to list</button>
                  {selected.photo_path && (
                    <img src={selected.photo_path.startsWith("/") ? selected.photo_path : `/uploads/${selected.photo_path}`} alt={selected.name} className="w-full h-32 object-cover rounded-lg" style={{ border: "2px solid #C9B29F" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{selected.name}</p>
                  <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{selected.sex === "Male" ? "♂ Male" : "♀ Female"}</p>
                  {selected.breeder && <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Breeder: {selected.breeder}</p>}
                  {selected.country && <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>📍 {selected.country} ({selected.continent})</p>}
                  <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>{new Date(selected.date_posted).toLocaleDateString()}</p>
                  <Link href={`/pedigree/custom/${selected.id}`} className="block w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", textDecoration: "none" }}>
                    View Full Pedigree
                  </Link>
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-4 text-center">
                  <img src="/logo.png" alt="Pedigree Platform" className="mx-auto mb-3 opacity-30" style={{ width: "48px", height: "48px" }} />
                  <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>No title alerts yet</p>
                </div>
              ) : (
                <div>
                  {alerts.map(a => (
                    <div key={a.id} onClick={() => { markRead(a.id); setSelected(a); }} className="p-3 transition-colors hover:bg-black/5 cursor-pointer" style={{ borderBottom: "1px solid #EDE4D5", opacity: a.is_read ? 0.6 : 1 }}>
                      <p className="text-xs truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)", fontWeight: a.is_read ? 400 : 700 }}>{a.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: a.is_read ? "#999" : "#4A4A4A", fontFamily: "var(--font-table)" }}>
                        {a.country ? `📍 ${a.country}` : a.continent || "Unknown"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
