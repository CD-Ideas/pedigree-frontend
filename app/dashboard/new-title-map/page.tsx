"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { getDogColor } from "@/app/utils/colors";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface TitleAlert {
  id: number;
  name: string;
  prefix: string;
  suffix_wins: string;
  suffix_losses: string;
  suffix_draws: string;
  suffix_honors: string;
  breeder: string;
  country: string;
  continent: string;
  sex: string;
  date_posted: string;
  photo_path: string;
  is_read: number;
}

const COUNTRY_COORDS: Record<string, [number, number]> = {
  // North America
  "United States": [-98, 39], "USA": [-98, 39], "Canada": [-106, 56], "Mexico": [-102, 23],
  // Central America
  "Guatemala": [-90.2, 15.8], "Belize": [-88.5, 17.2], "Honduras": [-86.2, 14.1],
  "El Salvador": [-88.9, 13.8], "Nicaragua": [-85.2, 12.9], "Costa Rica": [-84, 10], "Panama": [-80, 9],
  // Caribbean
  "Cuba": [-79, 22], "Jamaica": [-77.3, 18.1], "Haiti": [-72.3, 19], "Dominican Republic": [-70, 19],
  "Puerto Rico": [-66, 18], "Trinidad and Tobago": [-61.2, 10.5], "Barbados": [-59.5, 13.2],
  "Bahamas": [-77.4, 25], "Grenada": [-61.7, 12.1], "Antigua and Barbuda": [-61.8, 17.1],
  "Saint Lucia": [-61, 13.9], "Saint Vincent and the Grenadines": [-61.2, 13.2],
  "Dominica": [-61.4, 15.4], "Saint Kitts and Nevis": [-62.7, 17.3],
  "Curacao": [-69, 12.2], "Aruba": [-70, 12.5], "Cayman Islands": [-81.2, 19.3],
  "Turks and Caicos": [-71.8, 21.8], "Bermuda": [-64.8, 32.3],
  // South America
  "Brazil": [-51, -14], "Argentina": [-64, -34], "Colombia": [-74, 4], "Chile": [-71, -35],
  "Peru": [-76, -10], "Venezuela": [-66, 7], "Ecuador": [-78, -2], "Bolivia": [-65, -17],
  "Paraguay": [-58, -23], "Uruguay": [-56, -33], "Guyana": [-59, 5], "Suriname": [-56, 4],
  "French Guiana": [-53, 4],
  // Western Europe
  "United Kingdom": [-3, 54], "UK": [-3, 54], "England": [-1, 52], "Scotland": [-4, 57],
  "Wales": [-3.5, 52.5], "Ireland": [-8, 53], "France": [2, 47], "Spain": [-4, 40],
  "Portugal": [-8, 39], "Italy": [12, 43], "Germany": [10, 51], "Netherlands": [5, 52],
  "Belgium": [4, 51], "Switzerland": [8, 47], "Austria": [14, 48], "Luxembourg": [6.1, 49.8],
  "Monaco": [7.4, 43.7], "Andorra": [1.5, 42.5], "Liechtenstein": [9.5, 47.2],
  // Northern Europe
  "Sweden": [18, 62], "Norway": [8, 62], "Denmark": [10, 56], "Finland": [26, 64],
  "Iceland": [-19, 65],
  // Eastern Europe
  "Poland": [20, 52], "Czech Republic": [15, 50], "Czechia": [15, 50], "Slovakia": [19.5, 48.7],
  "Hungary": [19, 47], "Romania": [25, 46], "Bulgaria": [25, 43], "Croatia": [16, 45],
  "Serbia": [21, 44], "Bosnia and Herzegovina": [17.8, 44], "Slovenia": [15, 46],
  "North Macedonia": [21.7, 41.5], "Macedonia": [21.7, 41.5], "Albania": [20, 41],
  "Montenegro": [19.3, 42.7], "Kosovo": [21, 42.6], "Moldova": [28.8, 47],
  "Ukraine": [32, 49], "Belarus": [28, 53], "Lithuania": [24, 55.2], "Latvia": [24.6, 57],
  "Estonia": [25, 59], "Russia": [105, 62],
  // Southern Europe
  "Greece": [22, 39], "Turkey": [35, 39], "Cyprus": [33, 35], "Malta": [14.4, 35.9],
  // Middle East
  "Saudi Arabia": [45, 24], "UAE": [54, 24], "United Arab Emirates": [54, 24],
  "Qatar": [51.2, 25.3], "Bahrain": [50.5, 26], "Kuwait": [47.5, 29.3], "Oman": [57, 21],
  "Yemen": [48, 15.5], "Iran": [53, 33], "Iraq": [44, 33], "Israel": [35, 31],
  "Palestine": [35.2, 31.9], "Jordan": [36, 31], "Lebanon": [35.8, 33.9], "Syria": [38, 35],
  // Central Asia
  "Kazakhstan": [67, 48], "Uzbekistan": [64, 41], "Turkmenistan": [59, 39],
  "Kyrgyzstan": [75, 41], "Tajikistan": [69, 39], "Afghanistan": [67, 33],
  // South Asia
  "India": [79, 21], "Pakistan": [69, 30], "Bangladesh": [90, 24], "Sri Lanka": [81, 7],
  "Nepal": [84, 28], "Bhutan": [90.4, 27.5], "Maldives": [73, 3.2],
  // East Asia
  "China": [105, 35], "Japan": [138, 36], "South Korea": [128, 36], "North Korea": [127, 40],
  "Mongolia": [105, 47], "Taiwan": [121, 24],
  // Southeast Asia
  "Philippines": [122, 13], "Thailand": [101, 15], "Vietnam": [108, 16],
  "Indonesia": [120, -5], "Malaysia": [102, 4], "Singapore": [104, 1.3],
  "Myanmar": [96, 20], "Burma": [96, 20], "Cambodia": [105, 13], "Laos": [103, 18],
  "Brunei": [115, 4.5], "Timor-Leste": [126, -8.5], "East Timor": [126, -8.5],
  // Oceania
  "Australia": [134, -25], "New Zealand": [174, -41], "Papua New Guinea": [147, -6],
  "Fiji": [178, -18], "Samoa": [-172, -14], "Tonga": [-175, -21],
  "Solomon Islands": [160, -9], "Vanuatu": [167, -16],
  // North Africa
  "Egypt": [30, 27], "Morocco": [-6, 32], "Algeria": [3, 28], "Tunisia": [9, 34],
  "Libya": [17, 27],
  // West Africa
  "Nigeria": [8, 10], "Ghana": [-2, 8], "Senegal": [-14, 14], "Mali": [-4, 17],
  "Ivory Coast": [-5.5, 7.5], "Cote d'Ivoire": [-5.5, 7.5], "Burkina Faso": [-2, 12],
  "Niger": [8, 16], "Guinea": [-12, 11], "Sierra Leone": [-12, 8.5],
  "Liberia": [-10, 6.4], "Togo": [1.2, 8.6], "Benin": [2.3, 9.3],
  "Mauritania": [-10, 20], "Gambia": [-16.6, 13.4], "Guinea-Bissau": [-15, 12],
  "Cape Verde": [-24, 16],
  // East Africa
  "Kenya": [38, 0], "Tanzania": [35, -6], "Ethiopia": [40, 9], "Uganda": [32, 1],
  "Rwanda": [30, -2], "Burundi": [30, -3.5], "Somalia": [46, 6], "Eritrea": [39, 15.3],
  "Djibouti": [43, 11.5], "South Sudan": [32, 7], "Sudan": [30, 15],
  // Central Africa
  "Congo": [15, -4], "Democratic Republic of Congo": [22, -4], "DRC": [22, -4],
  "Cameroon": [12, 6], "Central African Republic": [21, 7], "Chad": [19, 15],
  "Gabon": [11.5, -0.8], "Equatorial Guinea": [10, 2], "Republic of the Congo": [15, -4],
  // Southern Africa
  "South Africa": [25, -29], "Zimbabwe": [30, -20], "Mozambique": [35, -18],
  "Zambia": [28, -15], "Malawi": [34, -14], "Botswana": [24, -22],
  "Namibia": [17, -22], "Angola": [18, -12], "Madagascar": [47, -19],
  "Mauritius": [57.5, -20.3], "Eswatini": [31.5, -26.5], "Swaziland": [31.5, -26.5],
  "Lesotho": [28.2, -29.6],
  // Georgia, Armenia, Azerbaijan
  "Georgia": [44, 42], "Armenia": [45, 40], "Azerbaijan": [50, 40.5],
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
  const [center, setCenter] = useState<[number, number]>([10, 10]);

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

  const buildName = (a: TitleAlert) => {
    let n = a.name;
    if (a.prefix && a.prefix !== "None") n = a.prefix + " " + n;
    const parts: string[] = [];
    if (a.suffix_wins && a.suffix_wins !== "0" && a.suffix_wins !== "") parts.push(a.suffix_wins);
    if (a.suffix_losses && a.suffix_losses !== "0" && a.suffix_losses !== "") parts.push(a.suffix_losses);
    if (a.suffix_draws && a.suffix_draws !== "0" && a.suffix_draws !== "") parts.push(a.suffix_draws);
    if (a.suffix_honors && a.suffix_honors !== "0" && a.suffix_honors !== "") parts.push(a.suffix_honors);
    if (parts.length > 0) n += " " + parts.join(" ");
    return n;
  };

  // Each alert gets its own pin — spread in circle if same location
  const coordCounts: Record<string, number> = {};
  const alertsWithCoords = alerts.map((a) => {
    const coords = getCoords(a);
    if (!coords) return null;
    const key = coords.join(",");
    const count = coordCounts[key] || 0;
    coordCounts[key] = count + 1;
    // Spread in circle: radius ~2 degrees, evenly spaced angles
    const radius = count === 0 ? 0 : 2;
    const angle = (count * 137.5 * Math.PI) / 180; // golden angle for even spread
    const adjustedCoords: [number, number] = [
      coords[0] + radius * Math.cos(angle),
      coords[1] + radius * Math.sin(angle),
    ];
    return { alert: a, coords: adjustedCoords };
  }).filter(Boolean) as { alert: TitleAlert; coords: [number, number] }[];

  return (
    <div className="min-h-screen" style={{ background: "#EDE4D5" }}>
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
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
          <div className="rounded-lg overflow-hidden" style={{ background: "#FAF7F2", border: "2px solid #C9B29F", borderRadius: "8px", height: "calc(100vh - 140px)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-40">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#C9B29F", borderTopColor: "transparent" }} />
              </div>
            ) : (
              <ComposableMap
                projectionConfig={{ scale: 130, center: [10, 10] }}
                width={800}
                height={450}
                style={{ width: "100%", height: "100%", background: "#FAFAFA" }}
              >
                <ZoomableGroup
                  zoom={zoom}
                  center={center}
                  onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates); setZoom(z); }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  filterZoomEvent={(evt: any) => evt?.type !== "wheel"}
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

                  {alertsWithCoords.map((item, i) => (
                    <Marker key={i} coordinates={item.coords}>
                      <circle
                        r={6}
                        fill={getDogColor(buildName(item.alert))}
                        stroke="#fff"
                        strokeWidth={2}
                        style={{ cursor: "pointer" }}
                        onClick={() => { markRead(item.alert.id); setSelected(item.alert); }}
                      />
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
                onClick={() => { setZoom(1); setCenter([10, 10]); }}
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
                <p style={{ fontSize: "16px", fontWeight: 900, color: getDogColor(buildName(selected)), fontFamily: "var(--font-table)", marginBottom: "8px" }}>
                  {buildName(selected)}
                </p>
                <p style={{ fontSize: "12px", color: selected.sex?.toUpperCase() === "MALE" ? "#1d5bbf" : "#9f1239", fontFamily: "var(--font-table)", marginBottom: "4px" }}>
                  {selected.sex?.toUpperCase() === "MALE" ? "♂" : "♀"} {selected.sex}
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
