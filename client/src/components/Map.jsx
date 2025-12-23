import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
  ZoomControl
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios"; 
import { FaSearch, FaMapMarkerAlt, FaLocationArrow } from "react-icons/fa"; 

// 1. Helper Function: Check if coordinates are valid numbers
const isValidCoord = (lat, lng) => {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
};

// 2. MapController: Handls camera movements (Initial, New User, or Manual Recenter)
function MapController({ me, route, destRoute, selectedUserId, forceRecenter, setForceRecenter }) {
  const map = useMap();
  const isInitialized = useRef(false);
  const lastTargetId = useRef(null);

  useEffect(() => {
    // Initial Load: Center on me once
    if (me && isValidCoord(me.lat, me.lng) && !isInitialized.current) {
        map.setView([me.lat, me.lng], 18);
        isInitialized.current = true;
    }

    // Centering Logic: Triggers on manual button click or when switching users
    const isNewTarget = selectedUserId !== lastTargetId.current;

    if (forceRecenter || isNewTarget) {
        if (route?.bbox) {
            const [minLon, minLat, maxLon, maxLat] = route.bbox;
            map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        } else if (destRoute?.bbox) {
            const [minLon, minLat, maxLon, maxLat] = destRoute.bbox;
            map.fitBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [50, 50] });
        } else if (me && isValidCoord(me.lat, me.lng)) {
            map.setView([me.lat, me.lng], 18);
        }
        
        setForceRecenter(false);
        lastTargetId.current = selectedUserId;
    }
  }, [forceRecenter, selectedUserId, route?.bbox, destRoute?.bbox, map, me]); 

  return null;
}

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
  const [forceRecenter, setForceRecenter] = useState(false);
  
  // State to track if map is moving/zooming (to disable marker transitions)
  const [isMapActive, setIsMapActive] = useState(false);

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

  // Events Tracker: Detects when the user interacts with the map
  const MapEventsTracker = () => {
    useMapEvents({
      zoomstart: () => setIsMapActive(true),
      zoomend: () => setIsMapActive(false),
      movestart: () => setIsMapActive(true),
      moveend: () => setIsMapActive(false),
      click: (e) => {
        if (window.confirm("Set this location as the Meeting Point?")) {
            onSetDestination({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      }
    });
    return null;
  };

  const usersArray = Array.isArray(users) ? users : Object.values(users || {});
  const me = usersArray.find((u) => u.userId === mySocketId);

  // Extract Path Coordinates
  let userPath = [];
  if (route?.features?.[0]?.geometry?.coordinates) {
    userPath = route.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }

  let destPath = [];
  if (destRoute?.features?.[0]?.geometry?.coordinates) {
    destPath = destRoute.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error("Search error:", error);
    }
    setIsSearching(false);
  };

  // Recenter Button Logic with Propagation Fix
  const RecenterButton = () => {
    const map = useMap();
    const btnRef = useRef(null);

    useEffect(() => {
        if (btnRef.current) {
            L.DomEvent.disableClickPropagation(btnRef.current);
        }
    }, []);

    return (
        <button 
            ref={btnRef}
            onClick={(e) => { e.preventDefault(); setForceRecenter(true); }}
            className="absolute top-24 right-4 z-[1001] bg-white p-4 rounded-full shadow-2xl border border-gray-100 text-blue-600 hover:bg-gray-50 active:scale-90 transition-all"
        >
            <FaLocationArrow className="text-xl" />
        </button>
    );
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${isMapActive ? 'zooming' : ''}`}>
      
      {/* 1. Search Bar Overlay */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1001] w-11/12 max-w-md" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSearch} className="flex shadow-xl">
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meeting point..." 
                className="w-full p-3 rounded-l-lg border-none outline-none text-gray-800"
            />
            <button type="submit" className="bg-blue-600 text-white p-3 rounded-r-lg hover:bg-blue-700 transition flex items-center justify-center">
                {isSearching ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : <FaSearch />}
            </button>
        </form>
        {searchResults.length > 0 && (
            <div className="bg-white mt-2 rounded-lg shadow-xl max-h-60 overflow-y-auto border border-gray-100">
                {searchResults.map((result, idx) => (
                    <div 
                        key={idx}
                        onClick={() => { onSetDestination({lat: parseFloat(result.lat), lng: parseFloat(result.lon)}); setSearchResults([]); }}
                        className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm flex items-center gap-2"
                    >
                        <FaMapMarkerAlt className="text-red-500" />
                        <span>{result.display_name}</span>
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* 2. Map Container */}
      <MapContainer
        center={currentLocation || [51.505, -0.09]}
        zoom={18}
        style={{ height: "100vh", width: "100%" }}
        zoomControl={false} 
        className="z-0"
      >
        <ZoomControl position="bottomright" />
        <MapEventsTracker />
        
        <MapController 
            me={me} 
            route={route} 
            destRoute={destRoute} 
            selectedUserId={selectedUserId}
            forceRecenter={forceRecenter}
            setForceRecenter={setForceRecenter}
        />
        
        <RecenterButton />
        <TileLayer attribution="&copy; OpenStreetMap" url={themes[theme]} />

        {/* 3. Render Users */}
        {usersArray.map((user) => {
            if (!isValidCoord(user.lat, user.lng)) return null;
            const isMe = user.userId === mySocketId;

            return (
                <React.Fragment key={user.userId}>
                    {/* Motion Aura */}
                    <Circle 
                        center={[user.lat, user.lng]} 
                        radius={15} 
                        pathOptions={{ 
                            fillColor: isMe ? '#3b82f6' : '#9ca3af', 
                            fillOpacity: 0.15, 
                            color: 'transparent' 
                        }} 
                    />
                    
                    <Marker 
                        position={[user.lat, user.lng]}
                        icon={new L.DivIcon({
                            className: 'smooth-marker',
                            html: `
                                <div style="position: relative;">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}" 
                                         style="width: 44px; height: 44px; border-radius: 50%; border: 3px solid white; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.2);" 
                                         class="${isMe ? 'my-location-pulse' : ''}"/>
                                    
                                    <div style="
                                        position: absolute; top: -10px; left: 50%; margin-left: -7px;
                                        width: 0; height: 0; 
                                        border-left: 7px solid transparent; border-right: 7px solid transparent;
                                        border-bottom: 14px solid ${isMe ? '#3b82f6' : '#4b5563'};
                                        transform: rotate(${user.heading || 0}deg);
                                        transform-origin: center 20px;
                                        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));
                                    "></div>
                                </div>
                            `,
                            iconSize: [44, 44],
                            iconAnchor: [22, 22]
                        })}
                    >
                        <Popup>
                            <div className="text-center">
                                <span className="font-bold text-gray-800">{user.name}</span> {isMe && "(You)"}<br/>
                                {user.distance && <span className="text-xs text-blue-600 font-medium">{user.distance} away</span>}
                            </div>
                        </Popup>
                    </Marker>
                </React.Fragment>
            );
        })}

        {/* 4. Render Routes */}
        {userPath.length > 0 && (
          <>
             <Polyline positions={userPath} color="#1e3a8a" weight={8} opacity={0.4} />
             <Polyline positions={userPath} color="#3b82f6" weight={5} opacity={1} />
          </>
        )}
        
        {destPath.length > 0 && (
          <>
             <Polyline positions={destPath} color="#7f1d1d" weight={8} opacity={0.4} />
             <Polyline positions={destPath} color="#ef4444" weight={5} opacity={1} />
          </>
        )}

        {/* 5. Destination Marker */}
        {destination && isValidCoord(destination.lat, destination.lng) && (
             <Marker 
                position={[destination.lat, destination.lng]}
                icon={new L.Icon({ 
                    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                })}
            >
                <Popup minWidth={160}>
                    <div className="p-1">
                        <b className="text-red-600">Meeting Point</b><br/>
                        {destStats ? (
                            <div className="mt-1 text-sm">
                                <b>Dist:</b> {destStats.dist}<br/>
                                <b>ETA:</b> {destStats.time}
                            </div>
                        ) : "Calculating route..."}
                    </div>
                </Popup>
            </Marker>
        )}
      </MapContainer>

      {/* 6. Theme Selector Overlay */}
      <div className="absolute bottom-8 left-4 z-[1001] bg-white rounded-lg shadow-lg p-2 border border-gray-200" onClick={e => e.stopPropagation()}>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="p-1 text-sm outline-none bg-transparent font-medium text-gray-700"
        >
          <option value="streets">🗺️ Streets</option>
          <option value="dark">🌑 Dark Mode</option>
          <option value="satellite">🛰️ Satellite</option>
        </select>
      </div>
    </div>
  );
};

export default Map;