import React, { useEffect, useState, useRef } from "react";
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

// Helper to safely check coordinates
const isValidCoord = (lat, lng) => {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
};

// --- LOGIC CONTROLLER COMPONENT ---
function MapController({ me, route, destRoute, selectedUserId }) {
  const map = useMap();
  const isInitialized = useRef(false);
  const lastRouteId = useRef(null);
  const lastSelectedUser = useRef(null);

  useEffect(() => {
    // 1. Initial Load: Center on "Me" exactly ONCE
    if (me && isValidCoord(me.lat, me.lng) && !isInitialized.current) {
        map.setView([me.lat, me.lng], 18);
        isInitialized.current = true;
    }

    // 2. New User Selected: Fit bounds (ONCE per selection)
    if (selectedUserId && selectedUserId !== lastSelectedUser.current) {
        lastSelectedUser.current = selectedUserId;
    }

    // 3. New Route Loaded: Fit bounds (ONCE per route load)
    if (route?.bbox && route !== lastRouteId.current) {
        const [minLon, minLat, maxLon, maxLat] = route.bbox;
        map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        lastRouteId.current = route;
    } 
    else if (destRoute?.bbox && destRoute !== lastRouteId.current) {
         const [minLon, minLat, maxLon, maxLat] = destRoute.bbox;
         map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
         lastRouteId.current = destRoute;
    }

  }, [me, route, destRoute, selectedUserId, map]); 

  return null;
}

// Click Handler for setting Destination
const MapClickHandler = ({ onSetDestination }) => {
  useMapEvents({
    click(e) {
        // Standard Leaflet Map Click
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
    route,         
    destRoute,     
    destStats,     
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

  let userPolylineCoords = [];
  if (route?.features?.[0]?.geometry?.coordinates) {
    userPolylineCoords = route.features[0].geometry.coordinates
        .filter(pt => Array.isArray(pt) && pt.length === 2)
        .map(([lng, lat]) => [lat, lng]);
  }

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

  // RECENTER BUTTON (FIXED with L.DomEvent.disableClickPropagation)
  const RecenterMap = () => {
    const map = useMap();
    const btnRef = useRef(null);

    // This useEffect is the Magic Fix.
    // It tells Leaflet specifically: "Ignore clicks on this element"
    useEffect(() => {
        if (btnRef.current) {
            L.DomEvent.disableClickPropagation(btnRef.current);
            L.DomEvent.disableScrollPropagation(btnRef.current);
        }
    }, []);
    
    const handleRecenter = (e) => {
        // Prevent default browser behavior
        e.preventDefault(); 
        e.stopPropagation();

        // 1. If Route exists, fit the route
        if (route?.bbox) {
             const [minLon, minLat, maxLon, maxLat] = route.bbox;
             map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        }
        // 2. If Destination Route exists, fit that
        else if (destRoute?.bbox) {
             const [minLon, minLat, maxLon, maxLat] = destRoute.bbox;
             map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        }
        // 3. Otherwise, just find ME
        else if(me && isValidCoord(me.lat, me.lng)) {
             map.setView([me.lat, me.lng], 18);
        }
    };

    return (
        <button 
            ref={btnRef} // Attach the ref here
            onClick={handleRecenter}
            className="absolute top-20 right-4 z-[1000] bg-white p-3 rounded-full shadow-xl border border-gray-300 hover:bg-gray-100 transition-transform transform active:scale-95"
            title="Recenter Map"
        >
            <FaLocationArrow className="text-blue-600 text-xl" />
        </button>
    );
  };

  return (
    <div className="relative w-full h-full">
      {/* Search Bar (Outside MapContainer - No propagation issues) */}
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

      {/* Theme Selector */}
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
        
        <MapController 
            me={me} 
            route={route} 
            destRoute={destRoute} 
            selectedUserId={selectedUserId} 
        />
        
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

        {/* USER ROUTE (BLUE) */}
        {userPolylineCoords.length > 0 && (
          <>
             <Polyline positions={userPolylineCoords} color="#1e3a8a" weight={8} opacity={0.6} />
             <Polyline positions={userPolylineCoords} color="#3b82f6" weight={5} opacity={1} />
          </>
        )}
        
        {/* DESTINATION ROUTE (RED) */}
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
      </MapContainer>
    </div>
  );
};

export default Map;