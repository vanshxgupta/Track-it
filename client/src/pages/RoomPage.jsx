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

import ChatWindow from '../components/ChatWindow'; 
import { BsChatDotsFill } from 'react-icons/bs'; 

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
    
    // Route States
    const [route, setRoute] = useState(null); // Route to Selected User
    const [destRoute, setDestRoute] = useState(null); // Route to Meeting Point
    const [destStats, setDestStats] = useState(null); // Distance/Time to Meeting Point
    
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [myLocation, setMyLocation] = useState(null);

    const [destination, setDestination] = useState(null);
    const [isChatOpen, setIsChatOpen] = useState(false);

    const lastLocationUpdate = useRef(0);

    useEffect(() => {
        const currentRoomId = getRoomIdfromURL();
        if (!currentRoomId) return;
        setRoomId(currentRoomId);

        joinRoom(currentRoomId, userName, travelMode);

        const handleReconnect = () => {
            console.log("Reconnected! Re-joining room...");
            joinRoom(currentRoomId, userName, travelMode);
        };
        socket.on("connect", handleReconnect);

        listenForDestination(setDestination);
        listenforUsersUpdates((data) => {
            setusers(data);
        });

        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        const handleLocation = (position) => {
            const { latitude, longitude } = position.coords;
            setMyLocation({ lat: latitude, lng: longitude });

            const now = Date.now();
            if (now - lastLocationUpdate.current > 2000) {
                emitLocationUpdate({ lat: latitude, lng: longitude, name: userName, mode: travelMode });
                lastLocationUpdate.current = now;
            }
        };

        const handleError = (error) => {
            console.error("Location error:", error);
        };

        const watchId = navigator.geolocation.watchPosition(handleLocation, handleError, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000,
        });

        return () => {
            socket.off('user-offline');
            socket.off('destinationUpdate');
            socket.off('locationUpdate');
            socket.off('connect', handleReconnect);
            navigator.geolocation.clearWatch(watchId);
        };
    }, [userName, travelMode]);

    // 1. Fetch Route to SELECTED USER
    useEffect(() => {
        const fetchRoute = async () => {
            if (!selectedUser) {
                setRoute(null);
                setLoadingRoute(false);
                return;
            }
            const me = users[socket.id];
            if (!me) return;
            setLoadingRoute(true);
            try {
                // FIXED: Changed process.env to import.meta.env
                const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
                const res = await axios.post(`${API_BASE}/api/locations/route`, {
                    start: { lat: me.lat, lng: me.lng },
                    end: { lat: selectedUser.lat, lng: selectedUser.lng },
                    mode: travelMode,
                });
                
                if (res.data && res.data.route) {
                    setRoute(res.data.route);
                }
            } catch (err) {
                console.error("Route error:", err);
                setRoute(null);
            }
            setLoadingRoute(false);
        };
        fetchRoute();
    }, [selectedUser, users, travelMode]);

    // 2. Fetch Route to DESTINATION (Meeting Point)
    useEffect(() => {
        const fetchDestRoute = async () => {
            // Need both My Location and Destination
            const me = users[socket.id];
            if (!destination || !me || !me.lat) {
                setDestRoute(null);
                setDestStats(null);
                return;
            }

            try {
                // FIXED: Changed process.env to import.meta.env
                const API_BASE = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
                const res = await axios.post(`${API_BASE}/api/locations/route`, {
                    start: { lat: me.lat, lng: me.lng },
                    end: { lat: destination.lat, lng: destination.lng },
                    mode: travelMode,
                });

                if (res.data && res.data.route) {
                    setDestRoute(res.data.route);
                    
                    const feature = res.data.route.features?.[0];
                    if (feature?.properties?.summary) {
                        const { distance, duration } = feature.properties.summary;
                        setDestStats({
                            dist: (distance / 1000).toFixed(1) + " km", 
                            time: Math.round(duration / 60) + " min"
                        });
                    } else if (feature?.properties?.segments?.[0]) {
                        const { distance, duration } = feature.properties.segments[0];
                        setDestStats({
                            dist: (distance / 1000).toFixed(1) + " km",
                            time: Math.round(duration / 60) + " min"
                        });
                    }
                }
            } catch (err) {
                console.error("Destination Route error:", err);
                setDestRoute(null);
                setDestStats(null);
            }
        };
        fetchDestRoute();
    }, [destination, users, travelMode]);

    const usersWithMe = {
        ...users,
        ...(myLocation ? { [socket.id]: { lat: myLocation.lat, lng: myLocation.lng, userId: socket.id, name: userName || "Me" } } : {})
    };

    const roomUrl = `${window.location.origin}/room/${encodeURIComponent(roomId)}`;

    return (
        <div className="relative flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="sticky top-0 z-30 bg-blue-500 p-2 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between ">
                    <div className="flex items-center w-full md:w-auto">
                        {windowWidth < 768 && !isSidebarOpen && (
                            <button
                                className="md:hidden mr-3 bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/20 transition"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        )}
                        <span className="ml-10 text-lg font-semibold tracking-wide text-white ">Room:</span>
                        <span className="ml-2 px-2 py-1 bg-white text-purple-700 rounded-md font-mono text-sm">{roomId}</span>
                    </div>

                    <div className="flex flex-col justify-center self-center sm:flex-row items-center gap-2 mt-2 md:mt-0 w-full md:w-auto">
                        <div className="flex items-center w-full sm:w-auto max-w-md">
                            <input
                                type="text"
                                value={roomUrl}
                                readOnly
                                className="flex-1 border-none px-3 py-2 rounded-l-md text-sm text-gray-700 border-green-500 border-2 bg-white focus:outline-none"
                                onFocus={e => e.target.select()} 
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(roomUrl);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="bg-green-500 hover:bg-green-600  text-white px-3 py-2 rounded-r-md text-sm font-medium transition "
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
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
                    {loadingRoute && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
                        </div>
                    )}
                    
                    <Map
                        users={usersWithMe}
                        mySocketId={socket.id}
                        
                        // Pass Selected User Route
                        route={route} 
                        
                        // Pass Destination Route & Stats
                        destRoute={destRoute}
                        destStats={destStats}
                        
                        selectedUser={selectedUser}
                        selectedUserId={selectedUser?.userId}
                        onSetDestination={setMeetingPoint}
                        destination={destination}
                    />

                    <button 
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        className="fixed bottom-6 right-6 z-[1002] bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition flex items-center justify-center hover:scale-105"
                    >
                        <BsChatDotsFill className="text-xl" />
                    </button>

                    <ChatWindow 
                        roomId={roomId}
                        userName={userName}
                        isOpen={isChatOpen}
                        onClose={() => setIsChatOpen(false)}
                    />
                </div>
            </div>
        </div>
    );
};

export default RoomPage;