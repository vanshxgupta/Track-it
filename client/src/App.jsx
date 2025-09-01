import { useEffect, useState } from 'react';
import React from 'react';
import Lottie from "lottie-react";
import deliveryAnimation from './assets/Delivery.json'; 
import socket,{listenforUsersUpdates, emitLocationUpdate, joinRoom } from './socket';



const getRoomIdfromURL = () => {

    const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/); //Gives the path part of the current page’s URL (without domain and query params).
    // https://example.com/room/abcd1234
    // then window.location.pathname will give // "/room/abcd1234"

    return match ? match[1] : null;
    // "/room/abcd1234".match(/\/room\/([a-zA-Z0-9_-]+)/); -> it will give ["/room/abcd1234", "abcd1234"] this as answer , and we will take the match[1] i.e 2nd element from here 

};


function App() {

    const [users,setusers]=useState();

    const [roomId, setRoomId] = useState(getRoomIdfromURL() || "");
    console.log(roomId);

    const [roomInput, setRoomInput] = useState('');//input from frontend ui

    const handleCreateRoom = (e) => {

        e.preventDefault();
        if (roomInput.trim()) {
            window.location.pathname = `/room/${encodeURIComponent(roomInput.trim())}`;//Ensures that the room name is safe to use in a URL. ,
            //  space vagera ya fir special character vagera hoga tooh unko %20 ya fir kuch aur kar karke url valid kar dega ye
        }

    };

    useEffect(()=>{

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
        emitLocationUpdate({lat:latitude,lng:longitude}); //socket.js mai create kiya hai , emitLocationUpdate se hum location bhej denge , aur socketHandler.js usko get kar lega

      }
      
      const handleError=(error)=>{//permission denied then , we cannot use the website
        alert('Location Permission Denied.Please allow location Access!');
      }

      
      const watchId = navigator.geolocation.watchPosition(handleLocation,handleError,{
        enableHighAccuracy:true,
        maximumAge:0, //not storing any cache 
        timeout:6000,//maximum time (in ms) the browser will wait to get a location fix before throwing an error.
      })

      listenforUsersUpdates(setusers)

      return()=>{
        socket.off('user-offline');
        navigator.geolocation.clearWatch(watchId);
      }


    },[window.location.pathname])



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


    //INSIDE THE ROOM
    return (
        <>
            <div className='bg-amber-200 min-h-screen flex items-center justify-center text-2xl font-bold'>HELLO</div>
        </>
    );
    
}

export default App;
