import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Map from '../components/Map';
import Sidebar from '../components/Sidebar';
import socket, { 
    listenforUsersUpdates, 
    emitLocationUpdate, 
    joinRoom, 
    setMeetingPoint, 
    listenForDestination 
} from '../socket.js';
// Make sure this path is correct
import { KalmanFilter } from '../utils/KalmanFilter'; 
import ChatWindow from '../components/ChatWindow'; 
import { BsChatDotsFill } from 'react-icons/bs'; 

// Helper: Distance calculation (Meters)
const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
    const R = 6371e3; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const getRoomIdfromURL = () => {
    const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

const RoomPage = ({ userName, travelMode }) => {
    const [users, setusers] = useState({});
    const [selectedUser, setSelectedUser] = useState(null);
    const [roomId, setRoomId] = useState(getRoomIdfromURL() || "");
    const [copied, setCopied] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [route, setRoute] = useState(null);
    const [destRoute, setDestRoute] = useState(null);
    const [destStats, setDestStats] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [myLocation, setMyLocation] = useState(null);
    const [heading, setHeading] = useState(0);
    const [destination, setDestination] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // --- REFS FOR SMOOTHING & OPTIMIZATION ---
    // 1. Kalman Filters for Location
    const latFilter = useRef(new KalmanFilter());
    const lngFilter = useRef(new KalmanFilter());
    
    // 2. Compass Smoothing Ref
    const currentHeadingRef = useRef(0);

    // 3. Rate Limiting Refs
    const lastLocationSent = useRef({ lat: 0, lng: 0 });
    const lastLocationUpdate = useRef(0);
    const lastRouteFetchTime = useRef(0);
    const lastFetchedCoords = useRef({ start: { lat: 0, lng: 0 }, end: { lat: 0, lng: 0 } });
    const isInitialRouteFetch = useRef(true);

    useEffect(() => {
        const currentRoomId = getRoomIdfromURL();
        if (!currentRoomId) return;
        setRoomId(currentRoomId);
        joinRoom(currentRoomId, userName, travelMode);

        // --- NEW COMPASS LOGIC (NO FLICKER) ---
        const handleOrientation = (e) => {
            let rawHeading = e.webkitCompassHeading || (360 - e.alpha);
            if (rawHeading === null || rawHeading === undefined) return;

            // Shortest Path Logic: 
            // Calculate difference between current and new angle
            let current = currentHeadingRef.current;
            let delta = rawHeading - (current % 360);

            // Fix the 360 -> 0 jump (e.g., 350 to 10 degrees)
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;

            // Apply Smoothing (Take 15% of new value, keep 85% of old)
            const smoothingFactor = 0.15; 
            const smoothedHeading = current + (delta * smoothingFactor);
            
            currentHeadingRef.current = smoothedHeading;
            setHeading(smoothedHeading); // Update state for UI
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }

        listenForDestination(setDestination);
        listenforUsersUpdates(setusers);

        const handleLocation = (position) => {
            const { latitude, longitude } = position.coords;
            
            // 1. Kalman Filter Apply karo
            const fLat = latFilter.current.filter(latitude);
            const fLng = lngFilter.current.filter(longitude);
            setMyLocation({ lat: fLat, lng: fLng });

            const now = Date.now();
            // Pichli bheji gayi location se distance check karo
            const lastLat = lastLocationSent.current.lat;
            const lastLng = lastLocationSent.current.lng;
            const distMoved = getDistance(fLat, fLng, lastLat, lastLng);

            // 🚀 NEW: Agar 5 meter se zyada chale, toh GPS se direction nikalo (Stable Rotation)
            if (distMoved > 5 && lastLat !== 0) {
                // Convert Degrees to Radians for Math functions
                const toRad = (deg) => deg * Math.PI / 180;
                const toDeg = (rad) => rad * 180 / Math.PI;

                const dLon = toRad(fLng - lastLng);
                const lat1 = toRad(lastLat);
                const lat2 = toRad(fLat);

                const y = Math.sin(dLon) * Math.cos(lat2);
                const x = Math.cos(lat1) * Math.sin(lat2) -
                          Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
                
                const brng = (toDeg(Math.atan2(y, x)) + 360) % 360;

                // Compass Ref aur State dono ko update kar do
                currentHeadingRef.current = brng;
                setHeading(brng); 
            }

            // 2. Rate Limit: Update only if moved > 15m OR 10s passed
            if (distMoved > 15 || (now - lastLocationUpdate.current > 10000)) {
                emitLocationUpdate({ 
                    lat: fLat, 
                    lng: fLng, 
                    name: userName, 
                    mode: travelMode, 
                    // Agar chal rahe hain toh GPS bearing jayegi, khade hain toh Compass wali
                    heading: currentHeadingRef.current 
                });
                lastLocationUpdate.current = now;
                lastLocationSent.current = { lat: fLat, lng: fLng };
            }
        };

        const watchId = navigator.geolocation.watchPosition(handleLocation, (err) => console.error(err), {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
        });

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            navigator.geolocation.clearWatch(watchId);
        };
    }, [userName, travelMode]); // Removed 'heading' from dependency to avoid re-running effect on every rotation

    // --- ROUTE FETCHING LOGIC (With Loop Fix) ---
    useEffect(() => {
        const fetchRoute = async () => {
            const me = users[socket.id];
            if (!selectedUser || !me || typeof me.lat !== 'number') {
                if (!selectedUser) setRoute(null);
                return;
            }

            const now = Date.now();
            // 🛑 Safety: 15s Throttle
            if (now - lastRouteFetchTime.current < 15000 && route) return;

            // 🛑 Safety: 40m Movement Threshold
            const distMe = getDistance(me.lat, me.lng, lastFetchedCoords.current.start.lat, lastFetchedCoords.current.start.lng);
            const distTarget = getDistance(selectedUser.lat, selectedUser.lng, lastFetchedCoords.current.end.lat, lastFetchedCoords.current.end.lng);

            if (distMe < 40 && distTarget < 40 && route) return;

            if (isInitialRouteFetch.current) setLoadingRoute(true);

            try {
                lastRouteFetchTime.current = now;
                const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
                const res = await axios.post(`${API_BASE}/api/locations/route`, {
                    start: { lat: me.lat, lng: me.lng },
                    end: { lat: selectedUser.lat, lng: selectedUser.lng },
                    mode: travelMode,
                });
                
                if (res.data?.route) {
                    setRoute(res.data.route);
                    lastFetchedCoords.current = { 
                        start: { lat: me.lat, lng: me.lng }, 
                        end: { lat: selectedUser.lat, lng: selectedUser.lng } 
                    };
                }
            } catch (err) { 
                console.error("Route fetch failed:", err); 
            } finally {
                setLoadingRoute(false);
                isInitialRouteFetch.current = false;
            }
        };

        const timer = setTimeout(fetchRoute, 2000);
        return () => clearTimeout(timer);
    }, [selectedUser, users, travelMode]);

    // --- DESTINATION ROUTE LOGIC ---
    useEffect(() => {
        const fetchDestRoute = async () => {
            const me = users[socket.id];
            if (!destination || !me || typeof me.lat !== 'number') return;

            try {
                const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
                const res = await axios.post(`${API_BASE}/api/locations/route`, {
                    start: { lat: me.lat, lng: me.lng },
                    end: { lat: destination.lat, lng: destination.lng },
                    mode: travelMode,
                });

                if (res.data?.route) {
                    setDestRoute(res.data.route);
                    const feature = res.data.route.features?.[0];
                    if (feature?.properties?.summary) {
                        const { distance, duration } = feature.properties.summary;
                        setDestStats({
                            dist: (distance / 1000).toFixed(1) + " km", 
                            time: Math.round(duration / 60) + " min"
                        });
                    }
                }
            } catch (err) { console.error(err); }
        };
        fetchDestRoute();
    }, [destination, users, travelMode]);

    // Construct users object for Map
    const usersWithMe = {
        ...users,
        ...(myLocation ? { 
            [socket.id]: { 
                ...users[socket.id], 
                lat: myLocation.lat, 
                lng: myLocation.lng, 
                userId: socket.id, 
                name: userName || "Me", 
                heading: heading // Using smoothed heading state
            } 
        } : {})
    };

    const roomUrl = `${window.location.origin}/room/${encodeURIComponent(roomId)}`;

    return (
        <div className="relative flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="sticky top-0 z-30 bg-blue-500 p-2 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between ">
                    <div className="flex items-center w-full md:w-auto">
                        {windowWidth < 768 && !isSidebarOpen && (
                            <button className="md:hidden mr-3 bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/20 transition" onClick={() => setIsSidebarOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        <span className="ml-10 text-lg font-semibold tracking-wide text-white ">Room:</span>
                        <span className="ml-2 px-2 py-1 bg-white text-purple-700 rounded-md font-mono text-sm">{roomId}</span>
                    </div>

                    <div className="flex flex-col justify-center sm:flex-row items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
                        <div className="flex items-center w-full sm:w-auto max-w-md">
                            <input type="text" value={roomUrl} readOnly className="flex-1 border-none px-3 py-2 rounded-l-md text-sm text-gray-700 border-green-500 border-2 bg-white focus:outline-none" onFocus={e => e.target.select()} />
                            <button onClick={() => { navigator.clipboard.writeText(roomUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                className="bg-green-500 hover:bg-green-600  text-white px-3 py-2 rounded-r-md text-sm font-medium transition ">
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative flex flex-1 overflow-hidden">
                {isSidebarOpen && (
                    <Sidebar
                        travelMode={travelMode}
                        username={userName || "Me"}
                        users={usersWithMe}
                        onSelectUser={setSelectedUser}
                        selectedUserId={selectedUser?.userId}
                        isOpen={isSidebarOpen}
                        setIsOpen={setIsSidebarOpen}
                        windowWidth={windowWidth}
                        mySocketId={socket.id}
                    />
                )}

                <div className="flex-1 relative z-0 bg-gradient-to-br from-blue-50 to-purple-100">
                    
                    {/* ETA BANNER */}
                    {destStats && destination && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] w-[90%] md:w-auto">
                            <div className="bg-white/95 backdrop-blur-md border border-blue-100 shadow-2xl rounded-2xl px-8 py-4 flex items-center gap-8">
                                <div className="flex flex-col items-center border-r border-gray-100 pr-8">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Distance</span>
                                    <span className="text-2xl font-black text-blue-600 tracking-tight">{destStats.dist}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">Time to Reach</span>
                                    <span className="text-2xl font-black text-green-600 tracking-tight">{destStats.time}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {loadingRoute && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
                        </div>
                    )}
                    
                    <Map
                        users={usersWithMe}
                        mySocketId={socket.id}
                        route={route} 
                        destRoute={destRoute}
                        destStats={destStats}
                        selectedUser={selectedUser}
                        selectedUserId={selectedUser?.userId}
                        onSetDestination={setMeetingPoint}
                        destination={destination}
                    />

                    <button onClick={() => setIsChatOpen(!isChatOpen)} className="fixed bottom-6 right-6 z-[1002] bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center hover:scale-105">
                        <BsChatDotsFill className="text-xl" />
                    </button>

                    <ChatWindow roomId={roomId} userName={userName} isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
                </div>
            </div>
        </div>
    );
};

export default RoomPage;