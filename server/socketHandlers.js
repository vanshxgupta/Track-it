const { Socket } = require("socket.io");
const { calculateDistanceAndETA } = require('./controllers/locationcontroller'); 

let roomUsers={};
// roomUsers ek object hai jisme har room ke andar kaunsa user hai aur unki info store hoti hai.
// Structure:
// {
//   "room1": {
//      "socketId1": { name: "User1", lat: 23.45, lng: 77.11, mode: "car" },
//      "socketId2": { name: "User2", lat: 22.11, lng: 78.44, mode: "walk" }
//   },
//   "room2": {
//      "socketId3": { name: "User3", lat: 19.07, lng: 72.87, mode: "car" }
//   }
// }
//
// Yaani, har room ke andar ek object hota hai jo socketId ko user details se map karta hai.
// Har user ke liye yeh details store hoti hain: name, latitude, longitude, aur travel mode.


// Helper function: convert roomUsers[roomId] into consistent object for frontend
function buildUsersObject(roomId) {
    const usersObj = {};
    if (!roomUsers[roomId]) return usersObj;
    Object.keys(roomUsers[roomId]).forEach((id) => {
        const u = roomUsers[roomId][id];
        usersObj[id] = {
            userId: id,
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
//   "userId": "socketId",
//   "name": "UserName",
//   "lat": 23.45,
//   "lng": 77.11,
//   "mode": "car",
//   "distance": "2 km",
//   "eta": "5 mins"
// }




const handleSocketConnection=(socket,io)=>{//Jab bhi koi naya client connect hota hai to ye function chalega.

    console.log('A user connected:',socket?.id);

    socket.on('joinRoom',({roomId,name,mode})=>{
        socket.join(roomId); // is user ko ek specific room me daal diya
        socket.roomId=roomId; //set the roomId on the socket object for later use
        
        if(!roomUsers[roomId]){
            roomUsers[roomId]={}; //if room doesn't exist , create a empty object
        }
        // room ke andar user ko add kar diya, name bhi save kar liya
        roomUsers[roomId][socket.id] = { 
            name: name || "Vansh", 
            mode: mode || "car",   
            lat: null, 
            lng: null 
        };

        // update sabko
        io.to(roomId).emit('locationUpdate', buildUsersObject(roomId));
    });

socket.on('locationUpdate', async (data) => {
    const { lat, lng, mode, username } = data; // make sure client sends username
    const roomId = socket.roomId;

    if (!roomId || !username) return;

    // Ensure user object exists
    if (!roomUsers[roomId][socket.id]) {
        roomUsers[roomId][socket.id] = { username };
    }
    roomUsers[roomId][socket.id].lat = lat;
    roomUsers[roomId][socket.id].lng = lng;

    const me = roomUsers[roomId][socket.id];
    const usersObj = {};

    // Build users object keyed by username instead of socket.id
    await Promise.all(
        Object.keys(roomUsers[roomId]).map(async (id) => {
            const user = roomUsers[roomId][id];
            if (!user || !user.username) return;

            usersObj[user.username] = {
                username: user.username,
                lat: user.lat,
                lng: user.lng,
                distance: null,
                eta: null,
            };

            if (me.lat != null && me.lng != null) {
                if (id === socket.id) {
                    usersObj[user.username].distance = "0 km";
                    usersObj[user.username].eta = "0 mins";
                } else if (user.lat != null && user.lng != null) {
                    try {
                        const result = await calculateDistanceAndETA(
                            { lat: user.lat, lng: user.lng },
                            { lat: me.lat, lng: me.lng },
                            mode || 'car'
                        );
                        usersObj[user.username].distance = result.distance;
                        usersObj[user.username].eta = result.duration;
                    } catch {
                        usersObj[user.username].distance = "N/A";
                        usersObj[user.username].eta = "N/A";
                    }
                }
            }
        })
    );

    io.to(roomId).emit('locationUpdate', usersObj);
});

    socket.on('disconnect', () => {
        const roomId = socket.roomId; // Get the room the socket was part of

        // If the room exists and has users
        if (roomId && roomUsers[roomId]) {
            // Remove the disconnected user from the room
            delete roomUsers[roomId][socket.id];

            // Prepare updated list of active users in the room
            const usersObj = buildUsersObject(roomId);

            // Notify all users in the room that someone went offline
            io.to(roomId).emit('user-offline', usersObj);

            // If no users left in the room, clean up the room entry
            if (Object.keys(roomUsers[roomId]).length === 0) {
                delete roomUsers[roomId];
            }
        }
    });

}

module.exports={handleSocketConnection};
