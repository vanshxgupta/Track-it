import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Map from '../components/Map'
import Sidebar from '../components/Sidebar';
import socket, { listenforUsersUpdates, emitLocationUpdate, joinRoom } from '../socket.js'

const getRoomIdfromURL = () => {
    const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/);
    //Gives the path part of the current page’s URL (without domain and query params).     
    // https://example.com/room/abcd1234     
    // then window.location.pathname will give // "/room/abcd1234"      
    return match ? match[1] : null;
      // "/room/abcd1234".match(/\/room\/([a-zA-Z0-9_-]+)/); -> it will give ["/room/abcd1234", "abcd1234"] this as answer , and we will take the match[1] i.e 2nd element from here   
};

const RoomPage = ({ userName, travelMode }) => {
    const [users, setusers] = useState({}); // default as empty object
    const [selectedUser, setSelectedUser] = useState(null);
    const [roomId, setRoomId] = useState(getRoomIdfromURL() || "");
    const [copied, setCopied] = useState(false);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
    const [route, setRoute] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [myLocation, setMyLocation] = useState(null);

    // This useEffect handles the core logic for joining the room and tracking location
    useEffect(() => {
        // Adding the user to the room
        const currentRoomId = getRoomIdfromURL();
        if (!currentRoomId) return;
        setRoomId(currentRoomId);
        joinRoom(currentRoomId, userName, travelMode); // socket.js se milega , vaha pr create kiya hai ye

        // Location
        if (!navigator.geolocation) { // location not supported ->send alert
            alert('Geolocation is not supported by your browser');
            return;
        }

        const handleLocation = (position) => { // send the lat and lng to the sockethandler to calculate the distance,eta and the route
            const { latitude, longitude } = position.coords;
            setMyLocation({ lat: latitude, lng: longitude }); // store my location locally
            emitLocationUpdate({ lat: latitude, lng: longitude, name: userName, mode: travelMode }); // socket.js mai create kiya hai , emitLocationUpdate se hum location bhej denge , aur socketHandler.js usko get kar lega
        };

        const handleError = (error) => { // permission denied then , we cannot use the website
            alert('Location Permission Denied. Please allow location Access!');
        };

        const watchId = navigator.geolocation.watchPosition(handleLocation, handleError, { // getcurrentposition
            enableHighAccuracy: true,
            maximumAge: 0, // not storing any cache
            timeout: 6000, // maximum time (in ms) the browser will wait to get a location fix before throwing an error.
        });

        listenforUsersUpdates(setusers);

        return () => {
            socket.off('user-offline');
            navigator.geolocation.clearWatch(watchId);
        };
    }, [userName, travelMode]);

    // This useEffect handles fetching the route when a user is selected
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
                const API_BASE = process.env.VITE_SERVER_URL || "http://localhost:4000";
                const res = await axios.post(`${API_BASE}/api/locations/route`, {
                    start: { lat: me.lat, lng: me.lng },
                    end: { lat: selectedUser.lat, lng: selectedUser.lng },
                    mode: travelMode,
                });
                setRoute(res.data);
            } catch (err) {
                console.error("Route fetch error:", err.response?.data || err.message);
                setRoute(null);
            }
            setLoadingRoute(false);
        };
        fetchRoute();
    }, [selectedUser, users, travelMode]);

    //  remove duplicate usersWithMe definition (keep only this object merge)
    const usersWithMe = {
        ...users,
        ...(myLocation ? { [socket.id]: { lat: myLocation.lat, lng: myLocation.lng, userId: socket.id, name: userName || "Me" } } : {})
    };

    // Creates a shareable room link
    const roomUrl = `${window.location.origin}/room/${encodeURIComponent(roomId)}`;

    return (
        <div className="relative flex flex-col h-screen overflow-hidden">
            {/* Top Bar */}
            <div className="sticky top-0 z-30 bg-blue-500 p-2 text-white shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between ">
                    <div className="flex items-center w-full md:w-auto">
                        {/* For mobile view Side Bar */}
                        {windowWidth < 768 && !isSidebarOpen && (
                            <button
                                className="md:hidden mr-3 bg-white/10 hover:bg-white/20 p-2 rounded-full border border-white/20 transition"
                                onClick={() => setIsSidebarOpen(true)}
                                aria-label="Open sidebar"
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
                                readOnly // we can not edit this
                                className="flex-1 border-none px-3 py-2 rounded-l-md text-sm text-gray-700 border-green-500 border-2 bg-white focus:outline-none"
                                onFocus={e => e.target.select()} // Jab input pe click/focus hoga, pura text auto select ho jaayega.
                            />
                            {/* Copy Room Link */}
                            <button
                                onClick={() => {
                                    // 1. Copy text to clipboard
                                    navigator.clipboard.writeText(roomUrl);
                                    // 2. State update → show "Copied!" instead of "Copy"
                                    setCopied(true);
                                    // 3. After 1.5 sec, reset back to "Copy"
                                    setTimeout(() => setCopied(false), 1500);
                                }}
                                className="bg-green-500 hover:bg-green-600  text-white px-3 py-2 rounded-r-md text-sm font-medium transition "
                                id="copyBtn"
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
                    // Sidebar mai jo jo chize display krwani ho vo daaldo ,
                    // Sidebar component kahi aur bana rkha hai ,idhr isme daalo aur jo props chahiye vo bhej do
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
                        route={route}
                        selectedUser={selectedUser}
                        selectedUserId={selectedUser?.userId}
                    />
                </div>
            </div>
        </div>
    );
};

export default RoomPage;