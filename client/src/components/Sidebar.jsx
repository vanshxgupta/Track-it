import React from 'react';
import UserCard from './UserCard';

const Sidebar = ({ users, onSelectUser, selectedUserId, isOpen, setIsOpen, windowWidth, myClientId }) => {
    // User selection closes sidebar on mobile
    const handleUserSelect = (user) => {
        if (user.userId !== myClientId) { // FIX: Use myClientId
            onSelectUser(user);
            if (windowWidth < 768) setIsOpen(false);
        }
    };

    // Close button
    const handleClose = () => setIsOpen(false);

    // Convert users object to array
    const usersArray = Object.values(users || {});

    // 1. Get the total number of active users
    const totalActiveUsers = usersArray.length;

    // 2. Sort the array so the current user (You) is ALWAYS at the top
    const sortedUsers = [...usersArray].sort((a, b) => {
        if (a.userId === myClientId) return -1;
        if (b.userId === myClientId) return 1;
        return 0; // Keep everyone else in their natural order
    });

    return (
        <>
            {/* Sidebar */}
            <div
                className={`
                    fixed top-0 left-0 z-40 h-full w-4/5 max-w-xs md:static md:z-10 md:w-80
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    bg-gradient-to-b from-white via-blue-50 to-blue-100
                    shadow-2xl md:shadow-md border-r border-gray-200
                    p-5 rounded-r-2xl md:rounded-none flex flex-col
                `}
                style={{ height: '100vh' }}
            >
                {/* Header with close button on mobile */}
                <div className="flex justify-between items-center mb-6">
                    {/* 3. Display the total number of users next to the title */}
                    <h2 className="text-2xl font-extrabold flex items-center gap-2 bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent drop-shadow-sm">
                        Active Users 
                        <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold shadow-inner">
                            {totalActiveUsers}
                        </span>
                    </h2>
                    {windowWidth < 768 && (
                        <button
                            className="md:hidden bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-transform transform hover:rotate-90"
                            onClick={handleClose}
                            aria-label="Close sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* User list */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {/* 4. Map over the sorted array instead of the raw array */}
                    {sortedUsers.map((user, idx) => {
                        const isMe = user.userId === myClientId;
                        
                        return (
                            <div
                                key={user.userId || idx} 
                                onClick={() => handleUserSelect(user)}
                                className={`
                                    ${selectedUserId === user.userId
                                        ? "bg-gradient-to-r from-green-100 to-blue-100 ring-2 ring-green-600 scale-[1.02]"
                                        : isMe
                                            ? "bg-blue-50 border-2 border-blue-400 shadow-md cursor-default" // Special styling for your own card
                                            : "hover:bg-white hover:shadow-lg cursor-pointer"} // Standard styling for others
                                    rounded-2xl transition-all duration-200 shadow-sm
                                `}
                            >
                                {/* 5. Dynamically append "(You)" to your own name without altering the backend data */}
                                <UserCard 
                                    user={{ ...user, name: isMe ? `${user.name} (You)` : user.name }} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Overlay for mobile */}
            {isOpen && windowWidth < 768 && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-40 z-30 md:hidden"
                    onClick={handleClose}
                />
            )}

            {/* Custom scrollbar styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #16a34a, #2563eb);
                    border-radius: 9999px;
                }
            `}</style>
        </>
    );
};

export default Sidebar;
