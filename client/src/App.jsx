import { useState } from 'react';
import React from 'react';
import Lottie from "lottie-react";
import deliveryAnimation from './assets/Delivery.json'; 



const getRoomIdfromURL = () => {

    const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/); //Gives the path part of the current page’s URL (without domain and query params).
    // https://example.com/room/abcd1234
    // then window.location.pathname will give // "/room/abcd1234"

    return match ? match[1] : null;
    // "/room/abcd1234".match(/\/room\/([a-zA-Z0-9_-]+)/); -> it will give ["/room/abcd1234", "abcd1234"] this as answer , and we will take the match[1] i.e 2nd element from here 

};


function App() {

    const [roomId, setRoomId] = useState(getRoomIdfromURL() || "");
    console.log(roomId);

    const [roomInput, setRoomInput] = useState('');//input from frontend ui

    const handleCreateRoom = (e) => {
        e.preventDefault();
        if (roomInput.trim()) {
            window.location.pathname = `/room/${encodeURIComponent(roomInput.trim())}`;
        }
    };

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
                <main className="flex-grow flex flex-col-reverse lg:flex-row items-center justify-between px-6 py-16 max-w-7xl mx-auto gap-12">
                    {/* Text and Form */}
                    <div className="w-full lg:w-1/2 space-y-8">

                        <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                            Coordinate with Friends & Family <br />
                            <span className="text-blue-600">In Real Time</span>
                        </h2>
                        
                        <p className="text-gray-600 text-lg">
                            Create a private room to share your live location. See how far away everyone is, find your way back to the group, and stay connected effortlessly.
                        </p>

                        <form onSubmit={handleCreateRoom} className="flex flex-col sm:flex-row gap-4">
                            <input
                                type="text"
                                value={roomInput}
                                onChange={(e) => setRoomInput(e.target.value)}
                                placeholder="Enter a unique room name"
                                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500"
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
                    <div className="w-full lg:w-1/3 rounded-full overflow-hidden">
                        <Lottie animationData={deliveryAnimation} loop={true} />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <>
            <div className='bg-amber-200'>HELLO</div>
        </>
    );
}

export default App;