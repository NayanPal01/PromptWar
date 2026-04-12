"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet's default icon missing issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const venueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) map.setView(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

/** Geocode any venue via OpenStreetMap Nominatim (free) */
async function geocodeVenue(venueName) {
  if (!venueName) return null;
  try {
    const q = encodeURIComponent(venueName + ", India");
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
  } catch (err) { console.warn("Geocode failed:", err); }
  return null;
}

/** Get driving route via OSRM (free) */
async function getRoute(fromLat, fromLng, toLat, toLng, mode = "driving") {
  try {
    // OSRM supports: car, foot, bike — use "car" for driving
    const profile = mode === "walking" ? "foot" : "car";
    const res = await fetch(`https://router.project-osrm.org/route/v1/${profile}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`);
    const data = await res.json();
    if (data.routes?.length > 0) {
      const coords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      const durationMin = Math.round(data.routes[0].duration / 60);
      const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
      return { coords, durationMin, distanceKm };
    }
  } catch (err) { console.warn("Route failed:", err); }
  return null;
}

export default function LiveMapImpl({ checkins, venueName }) {
  const [center, setCenter] = useState([20.5937, 78.9629]);
  const [zoom, setZoom] = useState(5);
  const [venueCoords, setVenueCoords] = useState(null);
  const [venueDisplayName, setVenueDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
  const [travelMode, setTravelMode] = useState("driving"); // driving | walking

  // Geocode venue
  useEffect(() => {
    if (!venueName) { setLoading(false); return; }
    setLoading(true);
    geocodeVenue(venueName).then(result => {
      if (result) {
        setVenueCoords([result.lat, result.lng]);
        setVenueDisplayName(result.displayName);
        setCenter([result.lat, result.lng]);
        setZoom(17);
      }
      setLoading(false);
    });
  }, [venueName]);

  // Get user position
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Compute route
  const computeRoute = useCallback(async () => {
    if (!userPos || !venueCoords) return;
    setShowRoute(true);
    const route = await getRoute(userPos[0], userPos[1], venueCoords[0], venueCoords[1], travelMode);
    if (route) setRouteData(route);
  }, [userPos, venueCoords, travelMode]);

  const activeLocations = useMemo(() => {
    return (checkins || []).filter((c) => c.status === "inside" && c.lat && c.lng);
  }, [checkins]);

  return (
    <div style={{ position: "relative" }}>
      {/* Controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", color: "#5f6368" }}>📍 <strong>{venueName || "No venue"}</strong></span>
          {venueCoords && <span style={{ fontSize: "0.7rem", background: "#e6f4ea", color: "#137333", padding: "0.15rem 0.4rem", borderRadius: "8px", fontWeight: 600 }}>Located ✓</span>}
          {loading && <span style={{ fontSize: "0.7rem", color: "#f9ab00", fontWeight: 600 }}>Searching...</span>}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {activeLocations.length > 0 && (
            <span style={{ fontSize: "0.7rem", background: "#e8f0fe", color: "#1a73e8", padding: "0.15rem 0.5rem", borderRadius: "8px", fontWeight: 600 }}>
              {activeLocations.length} live
            </span>
          )}
          {userPos && venueCoords && (
            <>
              {/* Travel mode toggle */}
              <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #dadce0" }}>
                {["driving", "walking"].map(m => (
                  <button key={m} onClick={() => setTravelMode(m)}
                    style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", fontWeight: 600, border: "none", cursor: "pointer",
                      background: travelMode === m ? "#1a73e8" : "#f8f9fa", color: travelMode === m ? "white" : "#5f6368" }}>
                    {m === "driving" ? "🚕 Cab" : "🚶 Walk"}
                  </button>
                ))}
              </div>
              <button onClick={computeRoute}
                style={{ fontSize: "0.75rem", background: "linear-gradient(135deg, #4f46e5, #7c3aed)", color: "white",
                  border: "none", borderRadius: "8px", padding: "0.3rem 0.7rem", cursor: "pointer", fontWeight: 600 }}>
                🛣️ Get Directions
              </button>
            </>
          )}
        </div>
      </div>

      {/* Route info */}
      {routeData && showRoute && (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.5rem 0.75rem", background: "linear-gradient(135deg, #ede9fe, #e8f0fe)", borderRadius: "10px", marginBottom: "0.75rem", border: "1px solid #c7d2fe" }}>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#4f46e5" }}>
            {travelMode === "driving" ? "🚕" : "🚶"} {routeData.distanceKm} km
          </div>
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0d904f" }}>
            ⏱️ ~{routeData.durationMin} min {travelMode === "driving" ? "by cab" : "walk"}
          </div>
          {travelMode === "driving" && (
            <div style={{ fontSize: "0.75rem", color: "#5f6368" }}>
              💰 Est. ₹{Math.round(parseFloat(routeData.distanceKm) * 12 + 30)}
            </div>
          )}
          <button onClick={() => { setShowRoute(false); setRouteData(null); }}
            style={{ marginLeft: "auto", fontSize: "0.7rem", background: "#fce8e6", color: "#d93025", border: "none", borderRadius: "6px", padding: "0.2rem 0.5rem", cursor: "pointer", fontWeight: 600 }}>
            Clear
          </button>
        </div>
      )}

      {/* Map */}
      <div style={{ background: "white", borderRadius: "12px", border: "1.5px solid #e8eaed", height: "450px", width: "100%", overflow: "hidden" }}>
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%", borderRadius: "8px" }}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='Tiles &copy; Esri' />
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="" />
          <MapUpdater center={center} zoom={zoom} />
          {venueCoords && (
            <Marker position={venueCoords} icon={venueIcon}>
              <Popup><strong>🏟️ {venueName}</strong><br /><span style={{ fontSize: "0.75rem" }}>{venueDisplayName}</span></Popup>
            </Marker>
          )}
          {userPos && (
            <Marker position={userPos} icon={userIcon}>
              <Popup><strong>📍 Your Location</strong></Popup>
            </Marker>
          )}
          {routeData && showRoute && (
            <Polyline positions={routeData.coords} pathOptions={{ color: "#4f46e5", weight: 5, opacity: 0.85, dashArray: "10 6" }} />
          )}
          {activeLocations.map((c) => (
            <Marker key={c.id} position={[c.lat, c.lng]}>
              <Popup><strong>{c.userName}</strong><br />Gate: {c.gateName}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
