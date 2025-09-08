import React, { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import mypin from "../assets/mypin.png"

const Map = ({ users, mySocketId, route, selectedUser, selectedUserId }) => {
  const [currentLocation, setCurrentLocation] = useState(null);
  const [theme, setTheme] = useState("streets"); 

  
  const themes = {
    streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    satellite:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setCurrentLocation([latitude, longitude]);
    });
  }, []);

  function FitBounds({ me, selectedUser }) {
    const map = useMap();
    useEffect(() => {
      if (
        me &&
        selectedUser &&
        me.lat &&
        me.lng &&
        selectedUser.lat &&
        selectedUser.lng
      ) {
        const bounds = L.latLngBounds([
          [me.lat, me.lng],
          [selectedUser.lat, selectedUser.lng],
        ]);
        map.fitBounds(bounds, { padding: [80, 80] });
      } else if (me && me.lat && me.lng) {
        map.setView([me.lat, me.lng], 17);
      }
    }, [me, selectedUser, map]);
    return null;
  }

  // ✅ Always treat users as an array
  const usersArray = Array.isArray(users) ? users : Object.values(users || {});

  // Find yourself
  const me = usersArray.find((u) => u.userId === mySocketId);

  // Extract polyline coordinates from GeoJSON
  let polylineCoords = [];
  if (route?.features?.[0]) {
    polylineCoords = route.features[0].geometry.coordinates.map(
      ([lng, lat]) => [lat, lng]
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Theme Selector Dropdown */}
      <div className="absolute top-4 left-4 z-[1000] bg-white rounded shadow p-2">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="p-1 border rounded text-sm"
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
        className="shadow-lg"
      >
        <FitBounds me={me} selectedUser={selectedUser} />

        {/* Dynamic Map Theme */}
        <TileLayer attribution="slrTech" url={themes[theme]} />

        {/* Your marker */}
        {me?.lat && me?.lng && (
          <Marker
            position={[me.lat, me.lng]}
            icon={new L.Icon({ iconUrl:mypin, iconSize: [70, 70] })}
          >
            <Popup>You are here</Popup>
          </Marker>
        )}

        {/* Other users */}
        {usersArray
          .filter((user) => user.userId !== mySocketId)
          .map(
            (user) =>
              user.lat &&
              user.lng && (
                <Marker
                  key={user.userId}
                  position={[user.lat, user.lng]}
                  icon={
                    selectedUserId === user.userId
                      ? new L.Icon({
                          iconUrl: "/mypin.png",
                          iconSize: [60, 80],
                          className: "border-4 border-yellow-500",
                        })
                      : new L.Icon({ iconUrl: "/mypin.png", iconSize: [50, 70] })
                  }
                >
                  <Popup>
                    <span
                      className={
                        selectedUserId === user.userId
                          ? "font-bold text-green-600"
                          : ""
                      }
                    >
                      User: {user.userId}
                    </span>
                    <br />
                    Distance: {user.distance ?? "N/A"} km <br />
                    ETA: {user.eta ?? "N/A"} min
                  </Popup>
                </Marker>
              )
          )}

        {/* Route polyline */}
        {polylineCoords.length > 0 && (
          <Polyline
            positions={polylineCoords}
            color="#F9A825"
            weight={6}
            opacity={0.8}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default Map;
