import React, { useState } from 'react';
import Lottie from "lottie-react";
import deliveryAnimation from '../assets/Delivery.json';

const HomePage = () => {
    const [roomInput, setRoomInput] = useState(''); // input from frontend ui

    // This function generates a random, 6-character alphanumeric ID.
    const generateRoomId = (length = 6) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // This handler is for the "Join Room" button. It uses the code from the input field.
    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (roomInput.trim()) {
            // Ensures that the room name is safe to use in a URL.
            window.location.pathname = `/room/${encodeURIComponent(roomInput.trim())}`;
        }
    };

    // This handler is for the "Create a New Room" button. It generates a new ID and redirects.
    const handleCreateNewRoom = () => {
        const newRoomId = generateRoomId();
        window.location.pathname = `/room/${newRoomId}`;
    };

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-white text-gray-800">
            {/* Header */}
            <header className="w-full bg-white shadow-md py-4 px-6 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-blue-600">Route-Share</h1>
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
                        Create a private room to share your live location or join an existing one using a code. Stay connected effortlessly.
                    </p>

                    {/* Form for joining an existing room */}
                    <form onSubmit={handleJoinRoom} className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            value={roomInput}
                            onChange={(e) => setRoomInput(e.target.value)}
                            placeholder="Enter room code to join"
                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition duration-300 font-semibold"
                        >
                            Join Room
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-500 font-medium">OR</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>
                    
                    {/* Button for creating a new room */}
                    <button
                        onClick={handleCreateNewRoom}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition duration-300 font-semibold shadow-md"
                    >
                        Create a New Room
                    </button>
                </div>

                {/* Lottie Animation */}
                <div className="w-80 h-80 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-1/3 lg:h-1/3 rounded-full overflow-hidden flex items-center justify-center">
                    <Lottie animationData={deliveryAnimation} loop={true} />
                </div>
            </main>
        </div>
    );
};

export default HomePage;