import React from 'react';
import { FaCar, FaWalking } from 'react-icons/fa';

const UserCard = ({ user, isMe, isSelected, username, travelMode }) => {
    // Determine the icon and background color based on the travel mode and selection.
    const isCar = travelMode === 'car';
    const bgColor = isSelected ? 'bg-blue-200' : 'bg-white';
    const ringColor = isSelected ? 'ring-2 ring-blue-500' : '';
    const hoverEffect = isMe ? '' : 'hover:scale-[1.02] hover:shadow-lg transition-all duration-200';

    return (
        <div className={`p-4 rounded-xl shadow-sm border border-gray-200 ${bgColor} ${ringColor} ${hoverEffect}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    {/* Display a different icon for "Me" for clear identification */}
                    {isMe ? (
                        <span className="text-xl mr-2 text-blue-600">📍</span>
                    ) : (
                        isCar ? (
                            <FaCar className="text-lg text-blue-500 mr-2" />
                        ) : (
                            <FaWalking className="text-lg text-green-500 mr-2" />
                        )
                    )}
                    <h2 className="text-lg font-bold text-gray-800 truncate">
                        {isMe ? `${username} (You)` : username}
                    </h2>
                </div>
                {isMe && (
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-500 text-white rounded-full">
                        YOU
                    </span>
                )}
            </div>
            {/* Display distance and ETA only for other users and if data is available */}
            {!isMe && user.distance && (
                <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <span className="font-medium">{user.distance}</span>
                    <span className="mx-2">•</span>
                    <span>{user.eta}</span>
                </div>
            )}
        </div>
    );
};

export default UserCard;
