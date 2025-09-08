import React, { useState } from 'react';
import Lottie from 'lottie-react';
import carAnimation from '../assets/Delivery.json';
import { FaCar, FaWalking } from 'react-icons/fa';

const RegistrationPage = ({ onSubmit }) => {
    const [name, setName] = useState('');
    const [mode, setMode] = useState('car'); // 'car' or 'walk'

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onSubmit(name.trim(), mode);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
                <h2 className="text-3xl font-extrabold text-blue-600 mb-6">
                    Join the Room
                </h2>
                <div className="w-48 h-48 mx-auto mb-6">
                    <Lottie animationData={carAnimation} loop={true} />
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
                        required
                    />
                    <div className="flex justify-around items-center space-x-4">
                        <button
                            type="button"
                            onClick={() => setMode('car')}
                            className={`flex-1 flex items-center justify-center p-4 rounded-lg transition-all duration-200 ${
                                mode === 'car'
                                    ? 'bg-blue-600 text-white shadow-lg scale-105'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            <FaCar className="text-2xl mr-2" />
                            <span className="font-semibold">Car</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('walk')}
                            className={`flex-1 flex items-center justify-center p-4 rounded-lg transition-all duration-200 ${
                                mode === 'walk'
                                    ? 'bg-green-600 text-white shadow-lg scale-105'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            <FaWalking className="text-2xl mr-2" />
                            <span className="font-semibold">Walk</span>
                        </button>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md transition duration-300"
                    >
                        Continue to Map
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationPage;