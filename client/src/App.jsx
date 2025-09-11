import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import RegistrationPage from './components/RegistrationPage'

// Moved from original App.js
const getRoomIdfromURL = () => {
    // Gives the path part of the current page’s URL (without domain and query params).
    // https://example.com/room/abcd1234
    // then window.location.pathname will give "/room/abcd1234"
    const match = window.location.pathname.match(/\/room\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
};

function App() {
    const [hasRegistered, setHasRegistered] = useState(false);
    const [userName, setUserName] = useState('');
    const [travelMode, setTravelMode] = useState('car');
    
    // We will use the URL to determine the initial room ID
    const initialRoomId = getRoomIdfromURL();

    const handleRegistration = (name, mode) => {
        setUserName(name);
        setTravelMode(mode);
        setHasRegistered(true);
    };

    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route
                    path="/room/:roomId"
                    element={
                        !hasRegistered ? (
                            <RegistrationPage onSubmit={handleRegistration} />
                        ) : (
                            <RoomPage
                                userName={userName}
                                travelMode={travelMode}
                            />
                        )
                    }
                />
                {/* Redirect from /room to / if no room ID is specified */}
                <Route path="/room" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;