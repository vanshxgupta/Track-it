import React from 'react';
import { FaCar, FaWalking } from 'react-icons/fa';

const UserCard = ({ user }) => {
  // Log user object
  console.log("UserCard received:", user);

  return (
    <div className="flex items-center p-4 bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm mx-auto">
      {user.mode === 'car' ? (
        <FaCar className="text-2xl text-blue-500 mr-4" />
      ) : (
        <FaWalking className="text-2xl text-green-500 mr-4" />
      )}
      
      <div className="flex-grow">
        <h2 className="text-lg font-bold text-gray-800 truncate">
          {user.name}
        </h2>
        {user.distance && (
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span>{user.distance}</span>
            <span className="mx-2">•</span>
            <span>{user.eta}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserCard;
