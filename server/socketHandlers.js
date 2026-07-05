const { Socket } = require("socket.io");
const { calculateDistanceAndETA } = require('./controllers/locationcontroller'); 

let roomUsers={};
// roomUsers ek object hai jisme har room ke andar kaunsa user hai aur unki info store hoti hai.
// Structure:
// {
//   "room1": {
//      "socketId1": { name: "User1", lat: 23.45, lng: 77.11, mode: "car" },
//      "socketId2": { name: "User2", lat: 22.11, lng: 78.44, mode: "walk" }
//   },
//   "room2": {
//      "socketId3": { name: "User3", lat: 19.07, lng: 72.87, mode: "car" }
//   }
// }
//
// Yaani, har room ke andar ek object hota hai jo socketId ko user details se map karta hai.
// Har user ke liye yeh details store hoti hain: name, latitude, longitude, aur travel mode.



//to solve the flaky socket problem:We need to map socket.id to clientId on the server. When a socket drops, we wait 15 seconds before deleting the user. If they reconnect with the same clientId, we clear the timer and resume silently.
// Store active disconnect timers
const disconnectTimers = {};
// Map physical socket.id to persistent clientId
const socketToClientMap = {};


// Helper function: convert roomUsers[roomId] into consistent object for frontend
function buildUsersObject(roomId) {
    const usersObj = {};
    if (!roomUsers[roomId]) return usersObj;
    Object.keys(roomUsers[roomId]).forEach((id) => {
        // *** FIX: Skip the destination key so we don't crash trying to read .name from it ***
        if (id === 'destination') return;

        const u = roomUsers[roomId][id];
        
        // Safety check to ensure u exists
        if (!u) return;

        usersObj[id] = {
            userId: id, // this is now the persistent clientId
            name: u.name || "No Username",
            lat: u.lat ?? null,
            lng: u.lng ?? null,
            mode: u.mode ,
            distance: u.distance ?? null,
            eta: u.eta ?? null,
        };
    });
    return usersObj;
}
// {
//   "userId": "socketId",
//   "name": "UserName",
//   "lat": 23.45,
//   "lng": 77.11,
//   "mode": "car",
//   "distance": "2 km",
//   "eta": "5 mins"
// }




const handleSocketConnection=(socket,io)=>{//Jab bhi koi naya client connect hota hai to ye function chalega.

    console.log('A user connected:',socket?.id);

    socket.on('joinRoom',({roomId,name,mode,clientId})=>{
        socket.join(roomId); // is user ko ek specific room me daal diya

        // Map the volatile socket.id to the persistent room and clientId
        socketToClientMap[socket.id] = { roomId, clientId };
        
        if(!roomUsers[roomId]){
            roomUsers[roomId]={}; //if room doesn't exist , create a empty object
            roomUsers[roomId].destination = null;// Initialize destination
        }


        // 1. RECONNECTION LOGIC: If user is in limbo, cancel the disconnect!
        if (disconnectTimers[clientId]) {
            clearTimeout(disconnectTimers[clientId]);
            delete disconnectTimers[clientId];
            
            // Update their physical socket reference and silently return
            roomUsers[roomId][clientId].socketId = socket.id;
            return; 
        }


        // 2. NEW CONNECTION LOGIC
        const userName = name || "Vansh";
        roomUsers[roomId][clientId] = { 
            socketId: socket.id,
            name: userName, 
            mode: mode || "car",   
            lat: null, 
            lng: null 
        };

        // update sabko
        io.to(roomId).emit('locationUpdate', buildUsersObject(roomId));

        //  ADDED: Notify others that user connected (System Message)
        socket.to(roomId).emit("receiveMessage", {
            roomId,
            author: "System",
            message: `${userName} has joined the room.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        // *** NEW: If a destination already exists, send it to the new user ***
        if (roomUsers[roomId].destination) {
            socket.emit('destinationUpdate', roomUsers[roomId].destination);
        }
    });


    socket.on('locationUpdate', async (data) => {
        const mapInfo = socketToClientMap[socket.id];
        if (!mapInfo) return;

        const {roomId,clientId}=mapInfo
        const { lat, lng, mode } = data; 

        if (!roomUsers[roomId] || !roomUsers[roomId][socket.id]) return;

        // 1. Update the specific user's location
        roomUsers[roomId][clientId].lat = lat;
        roomUsers[roomId][clientId].lng = lng;
        roomUsers[roomId][clientId].mode = mode; // Update mode dynamically

        const me = roomUsers[roomId][clientId];
        
        // 2. Build the response object (Keep keys as Socket IDs!)
        const usersObj = {};
        const promises = Object.keys(roomUsers[roomId]).map(async (id) => {
            // *** FIX: Skip destination key here too ***
            if (id === 'destination') return;

            const user = roomUsers[roomId][id];
            
            // Safety check to ensure user exists
            if (!user) return;

            // Initialize user data structure
            usersObj[id] = {
                userId: id, 
                name: user.name,
                lat: user.lat,
                lng: user.lng,
                mode: user.mode,
                distance: null,
                eta: null,
            };

            // 3. Calculate Distance (Only if both have location)
            if (me.lat && me.lng && user.lat && user.lng && id !== clientId) {
                try {
                    // FORCE 'driving-car' if the mathematical distance is huge to prevent ORS errors
                    // or just use the user's mode. 
                    // For stability, let's use the user's mode but fallback safely.
                    const result = await calculateDistanceAndETA(
                        { lat: user.lat, lng: user.lng },
                        { lat: me.lat, lng: me.lng },
                        user.mode 
                    );
                    usersObj[id].distance = result.distance;
                    usersObj[id].eta = result.duration;
                } catch (err) {
                    console.log(`ORS Error for ${user.name}:`, err.message);
                    usersObj[id].distance = "Far"; // Indicate they are far/unreachable
                    usersObj[id].eta = "-";
                }
            }
        });

        await Promise.all(promises);
        io.to(roomId).emit('locationUpdate', usersObj);
    });

    socket.on('disconnect', () => {
        const mapInfo = socketToClientMap[socket.id];
        if (!mapInfo) return;
        
        const { roomId, clientId } = mapInfo;
        delete socketToClientMap[socket.id]; // Clean up the map

        if (roomId && roomUsers[roomId] && roomUsers[roomId][clientId]) {
            const name = roomUsers[roomId][clientId].name || "Someone";

            // START THE 15-SECOND GRACE PERIOD
            disconnectTimers[clientId] = setTimeout(() => {
                delete roomUsers[roomId][clientId];
                const usersObj = buildUsersObject(roomId);

                io.to(roomId).emit("receiveMessage", {
                    roomId,
                    author: "System",
                    message: `${name} has left the room.`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });

                io.to(roomId).emit('user-offline', usersObj);

                const keys = Object.keys(roomUsers[roomId]);
                if (keys.length === 0 || (keys.length === 1 && keys[0] === 'destination')) {
                    delete roomUsers[roomId];
                }
                
                delete disconnectTimers[clientId]; // Cleanup timer
            }, 15000); // 15 seconds
        }
    });

    //set destinnation
    socket.on('setDestination', (coords) => {
        const mapInfo = socketToClientMap[socket.id];
        if (!mapInfo) return;
        const roomId = mapInfo.roomId;
        if (roomId && roomUsers[roomId]) {
            // Store destination in the room object (but outside the user list logic if possible, 
            // or just attach it to the roomUsers object if you want to keep it simple)
            // Better approach: Store it as a property of the room.
            roomUsers[roomId].destination = coords; // { lat, lng }
            
            // Broadcast the new destination to everyone
            io.to(roomId).emit('destinationUpdate', coords);
        }
    });

    // Inside handleSocketConnection
    socket.on("sendMessage", (data) => {
        // Broadcast to others in the room (excluding sender if you handled sender locally)
        socket.to(data.roomId).emit("receiveMessage", data);
    });

}

module.exports={handleSocketConnection};