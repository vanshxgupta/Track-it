import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
  ZoomControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios"; 
import { FaSearch, FaMapMarkerAlt, FaLocationArrow } from "react-icons/fa"; 

// Helper to safely check if a coordinate is valid numbers
const isValidCoord = (lat, lng) => {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
};

function FitBounds({ me, selectedUser, destination, route, destRoute }) {
  const map = useMap();

  useEffect(() => {
    try {
        const points = [];
        if (me && isValidCoord(me.lat, me.lng)) points.push([me.lat, me.lng]);
        if (selectedUser && isValidCoord(selectedUser.lat, selectedUser.lng)) points.push([selectedUser.lat, selectedUser.lng]);
        if (destination && isValidCoord(destination.lat, destination.lng)) points.push([destination.lat, destination.lng]);

        // Prioritize Route Bounding Boxes
        if (route?.bbox && route.bbox.length === 4) {
            const [minLon, minLat, maxLon, maxLat] = route.bbox;
            map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        } 
        else if (destRoute?.bbox && destRoute.bbox.length === 4) {
             const [minLon, minLat, maxLon, maxLat] = destRoute.bbox;
             map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        }
        else if (points.length > 1) {
            const bounds = L.latLngBounds(points);
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80] });
        } 
    } catch (err) {
        console.warn("FitBounds error ignored:", err);
    }
  }, [selectedUser?.userId, destination, route, destRoute, map]); 
  return null;
}

const MapClickHandler = ({ onSetDestination }) => {
  useMapEvents({
    click(e) {
      if (window.confirm("Set this location as the Meeting Point?")) {
        onSetDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
};

const Map = ({ 
    users, 
    mySocketId, 
    route,         // Route to Selected User
    destRoute,     // Route to Destination
    destStats,     // Stats for Destination
    selectedUser, 
    selectedUserId, 
    onSetDestination, 
    destination 
}) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [theme, setTheme] = useState("streets");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const themes = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    light: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setCurrentLocation([latitude, longitude]);
    });
  }, []);

  const usersArray = Array.isArray(users) ? users : Object.values(users || {});
  const me = usersArray.find((u) => u.userId === mySocketId);

  // Extract USER Route Coordinates (Blue)
  let userPolylineCoords = [];
  if (route?.features?.[0]?.geometry?.coordinates) {
    userPolylineCoords = route.features[0].geometry.coordinates
        .filter(pt => Array.isArray(pt) && pt.length === 2)
        .map(([lng, lat]) => [lat, lng]);
  }

  // Extract DESTINATION Route Coordinates (Red)
  let destPolylineCoords = [];
  if (destRoute?.features?.[0]?.geometry?.coordinates) {
    destPolylineCoords = destRoute.features[0].geometry.coordinates
        .filter(pt => Array.isArray(pt) && pt.length === 2)
        .map(([lng, lat]) => [lat, lng]);
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error("Search failed", error);
    }
    setIsSearching(false);
  };

  const selectSearchResult = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSetDestination({ lat, lng });
    setSearchResults([]);
    setSearchQuery("");
  };

  const RecenterMap = () => {
    const map = useMap();
    const handleRecenter = () => {
        if(me && isValidCoord(me.lat, me.lng)) map.setView([me.lat, me.lng], 18);
    };
    return (
        <button 
            onClick={handleRecenter}
            className="absolute bottom-24 right-4 z-[1000] bg-white p-3 rounded-full shadow-xl border border-gray-300 hover:bg-gray-100"
            title="Recenter on me"
        >
            <FaLocationArrow className="text-blue-600 text-xl" />
        </button>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] w-11/12 max-w-md">
        <form onSubmit={handleSearch} className="flex shadow-xl">
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meeting point..." 
                className="w-full p-3 rounded-l-lg border-none focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
                type="submit" 
                className="bg-blue-600 text-white p-3 rounded-r-lg hover:bg-blue-700 transition flex items-center justify-center"
            >
                {isSearching ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : <FaSearch />}
            </button>
        </form>

        {searchResults.length > 0 && (
            <div className="bg-white mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto border border-gray-100">
                {searchResults.map((result, idx) => (
                    <div 
                        key={idx}
                        onClick={() => selectSearchResult(result)}
                        className="p-3 border-b hover:bg-blue-50 cursor-pointer flex items-center gap-2 text-sm text-gray-700"
                    >
                        <FaMapMarkerAlt className="text-red-500 shrink-0" />
                        <span>{result.display_name}</span>
                    </div>
                ))}
            </div>
        )}
      </div>

      <div className="absolute bottom-8 left-4 z-[1000] bg-white rounded-lg shadow-lg p-2 border border-gray-200">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="p-1 text-sm outline-none bg-transparent"
        >
          <option value="streets">Streets</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="satellite">Satellite</option>
        </select>
      </div>

      <MapContainer
        center={currentLocation || [51.505, -0.09]}
        zoom={18}
        style={{ height: "100vh", width: "100%" }}
        className="z-0"
        zoomControl={false} 
      >
        <ZoomControl position="bottomright" />
        
        <FitBounds me={me} selectedUser={selectedUser} destination={destination} route={route} destRoute={destRoute} />
        <MapClickHandler onSetDestination={onSetDestination} />
        <RecenterMap /> 
        
        <TileLayer attribution="slrTech" url={themes[theme]} />

        {/* My Marker */}
        {me && isValidCoord(me.lat, me.lng) && (
          <Marker
            position={[me.lat, me.lng]}
            icon={new L.Icon({
                iconUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${me.name}`,
                iconSize: [50, 50],
                className: "rounded-full border-4 border-blue-600 shadow-xl bg-white",
              })}
          >
            <Popup><span className="font-bold">You</span></Popup>
          </Marker>
        )}

        {/* Other Users */}
        {usersArray
          .filter((user) => user.userId !== mySocketId)
          .map((user) => {
            if (!isValidCoord(user.lat, user.lng)) return null;
            return (
              <Marker
                key={user.userId}
                position={[user.lat, user.lng]}
                icon={new L.Icon({
                    iconUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
                    iconSize: [40, 40],
                    className: `rounded-full shadow-lg bg-white ${
                      selectedUserId === user.userId ? "border-4 border-yellow-500 scale-110" : "border-2 border-white"
                    }`,
                  })}
              >
                <Popup>
                    <span className="font-bold text-gray-800">{user.name}</span> <br/>
                    <span className="text-xs text-gray-500">Dist: {user.distance} | ETA: {user.eta}</span>
                </Popup>
              </Marker>
            );
          })}

        {/* --- 1. USER ROUTE (BLUE) --- */}
        {userPolylineCoords.length > 0 && (
          <>
             <Polyline positions={userPolylineCoords} color="#1e3a8a" weight={8} opacity={0.6} />
             <Polyline positions={userPolylineCoords} color="#3b82f6" weight={5} opacity={1} />
          </>
        )}
        {/* Fallback Straight Line */}
        {userPolylineCoords.length === 0 && me && selectedUser && 
         isValidCoord(me.lat, me.lng) && isValidCoord(selectedUser.lat, selectedUser.lng) && (
          <Polyline positions={[[me.lat, me.lng], [selectedUser.lat, selectedUser.lng]]} color="gray" weight={4} dashArray="10,10" opacity={0.5} />
        )}


        {/* --- 2. DESTINATION ROUTE (RED) --- */}
        {destPolylineCoords.length > 0 && (
          <>
             <Polyline positions={destPolylineCoords} color="#7f1d1d" weight={8} opacity={0.6} />
             <Polyline positions={destPolylineCoords} color="#ef4444" weight={5} opacity={1} />
          </>
        )}

        {/* Destination Marker */}
        {destination && isValidCoord(destination.lat, destination.lng) && (
             <Marker 
                position={[destination.lat, destination.lng]}
                icon={new L.Icon({ 
                    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })}
            >
                {/* POPUP WITH STATS */}
                <Popup minWidth={150}>
                    <div className="text-center">
                        <b className="text-red-600 text-lg">Meeting Point</b>
                        {destStats ? (
                            <div className="mt-2 text-sm bg-gray-100 p-2 rounded">
                                <div>🚗 <b>Distance:</b> {destStats.dist}</div>
                                <div>⏱️ <b>ETA:</b> {destStats.time}</div>
                            </div>
                        ) : (
                            <div className="mt-1 text-gray-400 text-xs">Calculating route...</div>
                        )}
                    </div>
                </Popup>
            </Marker>
        )}
        
        {/* Fallback Straight Line to Destination */}
        {me && destination && destPolylineCoords.length === 0 &&
         isValidCoord(me.lat, me.lng) && isValidCoord(destination.lat, destination.lng) && (
             <Polyline positions={[[me.lat, me.lng], [destination.lat, destination.lng]]} color="red" dashArray="10,10" />
        )}
      </MapContainer>
    </div>
  );
};

export default Map;