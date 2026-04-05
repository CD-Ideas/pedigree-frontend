"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
}

// Simple country coordinates for map pins (lat/lng approximations mapped to SVG viewBox)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  "United States": [200, 160], "USA": [200, 160], "Canada": [190, 120], "Mexico": [170, 190],
  "Brazil": [280, 280], "Argentina": [260, 340], "Colombia": [240, 230], "Chile": [250, 330],
  "United Kingdom": [430, 120], "UK": [430, 120], "England": [430, 120],
  "Germany": [460, 130], "France": [440, 140], "Spain": [420, 155], "Italy": [465, 150],
  "Netherlands": [450, 125], "Belgium": [445, 130], "Portugal": [410, 155],
  "Poland": [475, 125], "Romania": [490, 140], "Hungary": [475, 140],
  "Russia": [550, 110], "Turkey": [520, 155], "Greece": [490, 155],
  "Philippines": [700, 215], "Japan": [740, 155], "China": [660, 165],
  "South Korea": [720, 160], "India": [620, 200], "Thailand": [670, 210],
  "Indonesia": [690, 245], "Vietnam": [680, 205], "Malaysia": [680, 230],
  "Australia": [730, 310], "New Zealand": [770, 340],
  "South Africa": [490, 320], "Nigeria": [450, 225], "Kenya": [520, 250],
  "Egypt": [500, 185], "Morocco": [420, 175], "Tanzania": [520, 265],
  "Ghana": [435, 225], "Ethiopia": [530, 230],
  "Saudi Arabia": [540, 190], "UAE": [560, 195], "Iran": [560, 170],
  "Ireland": [420, 120], "Sweden": [465, 100], "Norway": [455, 95],
  "Denmark": [455, 115], "Finland": [490, 95], "Switzerland": [455, 140],
  "Austria": [465, 140], "Czech Republic": [465, 130], "Croatia": [475, 145],
  "Serbia": [480, 145], "Bulgaria": [490, 145],
  "Peru": [245, 270], "Venezuela": [255, 225], "Ecuador": [235, 245],
  "Bolivia": [260, 290], "Paraguay": [270, 300], "Uruguay": [275, 320],
  "Cuba": [220, 195], "Dominican Republic": [240, 195], "Puerto Rico": [245, 195],
  "Costa Rica": [210, 215], "Panama": [220, 220],
};

// Continent coordinates for fallback
const CONTINENT_COORDS: Record<string, [number, number]> = {
  "North America": [200, 160], "South America": [265, 280], "Europe": [460, 130],
  "Africa": [470, 240], "Asia": [640, 170], "Oceania": [730, 310],
  "Central America": [210, 210], "Caribbean": [235, 195],
};

export default function NewTitleMapPage() {
  const [alerts, setAlerts] = useState<TitleAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TitleAlert | null>(null);

  useEffect(() => {
    fetch("/api/title-alerts")
      .then(r => r.ok ? r.json() : { alerts: [] })
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const getCoords = (a: TitleAlert): [number, number] | null => {
    if (a.country && COUNTRY_COORDS[a.country]) return COUNTRY_COORDS[a.country];
    if (a.continent && CONTINENT_COORDS[a.continent]) return CONTINENT_COORDS[a.continent];
    return null;
  };

  // Group alerts by location
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
              Dogs announced worldwide {"\u2022"} Click a pin to see details
            </p>
          </div>
          <Link href="/dashboard/new-title-alerts" className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", border: "2px solid #C9B29F", textDecoration: "none" }}>
            {"\u2190"} Alert List
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
              <svg viewBox="0 0 900 450" style={{ width: "100%", height: "auto", background: "#FAFAFA" }}>
                {/* Simple world map outline */}
                {/* North America */}
                <path d="M120,80 L130,70 L160,65 L200,60 L240,65 L260,80 L270,100 L280,120 L275,140 L260,160 L240,180 L220,195 L200,200 L180,195 L160,190 L140,180 L130,160 L120,140 L115,120 L115,100 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* Central America */}
                <path d="M180,195 L200,200 L210,210 L220,220 L225,230 L220,235 L210,230 L200,220 L190,210 L185,200 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* South America */}
                <path d="M225,230 L240,220 L260,215 L280,220 L300,230 L310,250 L315,270 L310,290 L300,310 L290,330 L275,345 L260,350 L250,340 L245,320 L240,300 L235,280 L230,260 L228,245 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* Europe */}
                <path d="M410,90 L430,85 L460,80 L490,85 L510,95 L520,110 L515,130 L510,145 L500,155 L490,160 L470,155 L450,155 L435,150 L425,140 L415,130 L410,115 L408,100 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* Africa */}
                <path d="M420,170 L440,165 L460,170 L480,175 L500,180 L520,190 L530,210 L535,230 L530,260 L520,280 L510,300 L500,315 L490,325 L475,330 L460,325 L450,310 L440,290 L435,270 L430,250 L425,230 L420,210 L418,190 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* Asia */}
                <path d="M520,80 L560,70 L600,65 L640,70 L680,80 L720,95 L740,110 L750,130 L745,150 L735,170 L720,185 L700,195 L680,200 L660,210 L640,215 L620,210 L600,200 L580,190 L560,175 L545,160 L530,145 L525,125 L520,105 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* Southeast Asia / Indonesia */}
                <path d="M660,220 L680,215 L700,220 L720,230 L730,240 L725,250 L710,255 L690,250 L675,245 L665,235 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />
                {/* Australia */}
                <path d="M700,280 L720,275 L745,278 L760,285 L770,300 L775,315 L770,330 L760,340 L745,345 L725,342 L710,335 L700,320 L695,305 L698,290 Z" fill="#EDE4D5" stroke="#C9B29F" strokeWidth="1" />

                {/* Pins */}
                {Object.values(pinGroups).map((group, i) => (
                  <g key={i} onClick={() => setSelected(group.alerts[0])} style={{ cursor: "pointer" }}>
                    <circle cx={group.coords[0]} cy={group.coords[1]} r={group.alerts.length > 1 ? 8 : 6} fill="#ef4444" stroke="#fff" strokeWidth="2" opacity="0.9" />
                    {group.alerts.length > 1 && (
                      <text x={group.coords[0]} y={group.coords[1] + 3.5} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">{group.alerts.length}</text>
                    )}
                  </g>
                ))}
              </svg>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-72 flex-shrink-0 rounded-lg overflow-hidden" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px", maxHeight: "600px" }}>
            <div style={{ background: "#1C1C1C", padding: "12px 16px" }}>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#FAF7F2", fontFamily: "var(--font-table)" }}>
                {selected ? "Dog Details" : `All Alerts (${alerts.length})`}
              </p>
            </div>
            <div style={{ overflow: "auto", maxHeight: "550px" }}>
              {selected ? (
                <div className="p-4 space-y-3">
                  <button onClick={() => setSelected(null)} className="text-xs font-bold" style={{ color: "#1d5bbf", fontFamily: "var(--font-table)" }}>{"\u2190"} Back to list</button>
                  {selected.photo_path && (
                    <img src={selected.photo_path.startsWith("/") ? selected.photo_path : `/uploads/${selected.photo_path}`} alt={selected.name} className="w-full h-32 object-cover rounded-lg" style={{ border: "2px solid #C9B29F" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <p className="text-sm font-bold" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{selected.name}</p>
                  <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{selected.sex === "Male" ? "\u2642 Male" : "\u2640 Female"}</p>
                  {selected.breeder && <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>Breeder: {selected.breeder}</p>}
                  {selected.country && <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>{"\ud83d\udccd"} {selected.country} ({selected.continent})</p>}
                  <p className="text-xs" style={{ color: "#4A4A4A", fontFamily: "var(--font-mono)" }}>{new Date(selected.date_posted).toLocaleDateString()}</p>
                  <Link href={`/pedigree/custom/${selected.id}`} className="block w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-center transition-all hover:scale-105" style={{ background: "#1C1C1C", color: "#FAF7F2", fontFamily: "var(--font-table)", textDecoration: "none" }}>
                    View Full Pedigree
                  </Link>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: "#C9B29F" }}>
                  {alerts.map(a => (
                    <button key={a.id} onClick={() => setSelected(a)} className="w-full text-left p-3 transition-colors hover:bg-black/5" style={{ borderBottom: "1px solid #EDE4D5" }}>
                      <p className="text-xs font-bold truncate" style={{ color: "#1C1C1C", fontFamily: "var(--font-table)" }}>{a.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#4A4A4A", fontFamily: "var(--font-table)" }}>
                        {a.country ? `\ud83d\udccd ${a.country}` : a.continent || "Unknown"}
                      </p>
                    </button>
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
