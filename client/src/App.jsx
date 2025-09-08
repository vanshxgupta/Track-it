import { useEffect, useState } from 'react'; 
import React from 'react'; 
import Lottie from "lottie-react"; 
import deliveryAnimation from './assets/Delivery.json';  
import socket,{listenforUsersUpdates, emitLocationUpdate, joinRoom } from './socket'; 
import Map from './components/Map'; 
import Sidebar from './components/Sidebar'; 
import axios from 'axios';    
import RegistrationPage from './components/RegistrationPage'; // Import the new component

const getRoomIdfromURL = () => {      
    const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/); //Gives the path part of the current page’s URL (without domain and query params).     
    // https://example.com/room/abcd1234     
    // then window.location.pathname will give // "/room/abcd1234"      
    return match ? match[1] : null;     
    // "/room/abcd1234".match(/\/room\/([a-zA-Z0-9_-]+)/); -> it will give ["/room/abcd1234", "abcd1234"] this as answer , and we will take the match[1] i.e 2nd element from here   
};   

function App() {      
    const [users,setusers]=useState({}); // default as empty object     
    const [selectedUser, setSelectedUser] = useState(null);      

    const [roomId, setRoomId] = useState(getRoomIdfromURL() || "");     
    console.log('roomId:',roomId);      

    const [roomInput, setRoomInput] = useState('');//input from frontend ui     
    const [copied, setCopied] = useState(false);     
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);      

    console.log('windowWidth:',windowWidth);      

    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);     
    const [route, setRoute] = useState(null);     
    const [loadingRoute, setLoadingRoute] = useState(false);      

    // Track my location separately (so we can include it in usersWithMe)     
    const [myLocation, setMyLocation] = useState(null);       

    // New State for registration
    const [hasRegistered, setHasRegistered] = useState(false);
    const [userName, setUserName] = useState('');
    const [travelMode, setTravelMode] = useState('car'); // Default mode
  
    const handleCreateRoom = (e) => {          
        e.preventDefault();         
        if (roomInput.trim()) {             
            window.location.pathname = `/room/${encodeURIComponent(roomInput.trim())}`;//Ensures that the room name is safe to use in a URL. ,             
            //  space vagera ya fir special character vagera hoga tooh unko %20 ya fir kuch aur kar karke url valid kar dega ye         
        }      
    };      
    
    const handleRegistration = (name, mode) => {
        setUserName(name);
        setTravelMode(mode);
        setHasRegistered(true);
    };

    useEffect(()=>{        
        if (!hasRegistered) return; // Only proceed if the user has registered

        //Adding the user to the room       
        const currentRoomId=getRoomIdfromURL();       
        if(!currentRoomId) return ;       
        setRoomId(currentRoomId);       
        joinRoom(currentRoomId); //socket.js se milega , vaha pr create kiya hai ye         

        //Location        
        if(!navigator.geolocation){//location not supported ->send alert         
            alert('Geolocation is not supported by your browser');         
            return ;       
        }         

        const handleLocation=(position)=>{//send the lat and lng to the sockethandler to calculate the distance,eta and the route         
            const {latitude,longitude}=position.coords;         
            setMyLocation({ lat: latitude, lng: longitude }); // store my location locally         
            emitLocationUpdate({lat:latitude,lng:longitude, name: userName, mode: travelMode}); //socket.js mai create kiya hai , emitLocationUpdate se hum location bhej denge , aur socketHandler.js usko get kar lega        
        }              

        const handleError=(error)=>{//permission denied then , we cannot use the website         
            alert('Location Permission Denied.Please allow location Access!');       
        }               

        const watchId = navigator.geolocation.watchPosition(handleLocation,handleError,{//getcurrentposition         
            enableHighAccuracy:true,         
            maximumAge:0, //not storing any cache          
            timeout:6000,//maximum time (in ms) the browser will wait to get a location fix before throwing an error.       
        })        

        listenforUsersUpdates(setusers)        

        return()=>{         
            socket.off('user-offline');         
            navigator.geolocation.clearWatch(watchId);       
        }       
    },[hasRegistered, userName, travelMode])       

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
                const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";       
                const res = await axios.post(`${API_BASE}/api/locations/route`, {                     
                    start: { lat: me.lat, lng: me.lng },                     
                    end: { lat: selectedUser.lat, lng: selectedUser.lng },
                    mode: travelMode,
                });                 
                setRoute(res.data);             
            }catch (err) {
            console.error("Route fetch error:", err.response?.data || err.message);
            setRoute(null);
            }
                
            setLoadingRoute(false);         
        };         
        fetchRoute();     
    }, [selectedUser, users, travelMode]);      

    // ✅ FIX: remove duplicate usersWithMe definition (keep only this object merge)   
    const usersWithMe = {         
        ...users,         
        ...(myLocation ? { [socket.id]: { lat: myLocation.lat, lng: myLocation.lng, userId: socket.id, name: userName || "Me" } } : {})     
    };       


    //LANDING PAGE     
    if (!roomId) {         
        return (             
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white text-gray-800">                  

                {/* Header */}                 
                <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">                     
                    <h1 className="text-2xl font-bold text-blue-600">SpotSync</h1>                     
                    <nav className="hidden md:flex space-x-6 text-gray-600 font-medium">                         
                        {/* <a href="#home" className="hover:text-blue-600">Home</a>                         
                        <a href="#room" className="hover:text-blue-600">Join Room</a>                         
                        <a href="#help" className="hover:text-blue-600">Help</a> */}                     
                    </nav>                 
                </header>                  

                {/* Hero Section */}                 
                <main className="flex-grow flex flex-col lg:flex-row items-center justify-between px-4 sm:px-6 py-12 sm:py-16 max-w-7xl mx-auto gap-8 sm:gap-12">                     
                    {/* Text and Form */}                     
                    <div className="w-full lg:w-1/2 space-y-6 sm:space-y-8">                          

                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-tight text-center lg:text-left">                             
                            Coordinate with Friends & Family <br />                             
                            <span className="text-blue-600">In Real Time</span>                         
                        </h2>                                                  

                        <p className="text-gray-600 text-base sm:text-lg text-center lg:text-left">                             
                            Create a private room to share your live location. See how far away everyone is, find your way back to the group, and stay connected effortlessly.                         
                        </p>                           

                        {/* Form */}                         
                        <form onSubmit={handleCreateRoom} className="flex flex-col sm:flex-row gap-4">                             
                            <input                                 
                                type="text"                                 
                                value={roomInput}                                 
                                onChange={(e) => setRoomInput(e.target.value)}                                 
                                placeholder="Enter a unique room name"                                 
                                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"                                 
                                required                             
                            />                             
                            <button                                 
                                type="submit"                                 
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300"                             
                            >                                 
                                Join Room                             
                            </button>                         
                        </form>                     
                    </div>                      

                    {/* Lottie Animation */}                     
                    <div className="w-80 h-80 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-1/3 lg:h-1/3 rounded-full overflow-hidden flex items-center justify-center">                         
                        <Lottie animationData={deliveryAnimation} loop={true} />                     
                    </div>                 
                </main>             
            </div>         
        );     
    }        

    // New registration page view
    if (roomId && !hasRegistered) {
        return <RegistrationPage onSubmit={handleRegistration} />;
    }

    // Creates a shareable room link     
    const roomUrl = `${window.location.origin}/room/${encodeURIComponent(roomId)}`;       

    //INSIDE THE ROOM     
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
                                onFocus={e => e.target.select()}//Jab input pe click/focus hoga, pura text auto select ho jaayega.                             
                            />                              
                            {/* Copy Room Link */}                             
                            <button                                 
                                onClick={() => {                                     
                                    // // 1. Copy text to clipboard                                     
                                    navigator.clipboard.writeText(roomUrl);                                      

                                    // 2. State update → show "Copied!" instead of "Copy"                                     
                                    setCopied(true);                                      

                                    /// 3. After 1.5 sec, reset back to "Copy"                                     
                                    setTimeout(() => setCopied(false), 1500);                                  

                                }}                                 
                                className="bg-green-500 hover:bg-green-600  text-white px-3 py-2 rounded-r-md text-sm font-medium transition "                                 
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
                    //Sidebar mai jo jo chize display krwani ho vo daaldo ,                      
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

export default App;// i have passed the username, and travelmode in the sidebar, so all of them should display username, instead of user id, do that