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
        const { lat, lng } = data; // We only need lat and lng from the client update
        const roomId = socket.roomId;
        const currentUserId = socket.id;
    
        // Validate that the user and room exist before proceeding
        if (!roomId || !roomUsers[roomId] || !roomUsers[roomId][currentUserId]) {
            console.warn(`Received invalid location update from socket: ${currentUserId}`);
            return;
        }
    
        // 1. Update the current user's location in our main `roomUsers` object.
        const currentUser = roomUsers[roomId][currentUserId];
        currentUser.lat = lat;
        currentUser.lng = lng;
    
        // 2. Asynchronously calculate the distance and ETA for every other user in the room
        //    relative to the user who just updated their location.
        await Promise.all(
            Object.keys(roomUsers[roomId]).map(async (targetId) => {
                const targetUser = roomUsers[roomId][targetId];
    
                // If the target is the user who just moved, set their distance to 0.
                if (targetId === currentUserId) {
                    targetUser.distance = '0.00 km';
                    targetUser.eta = '0 mins';
                    return; // Move to the next user in the map function
                }
                
                // Ensure both users have valid coordinates to avoid unnecessary API calls.
                if (currentUser.lat && currentUser.lng && targetUser.lat && targetUser.lng) {
                    try {
                        // Calculate route from the user who moved (currentUser) to the other user (targetUser).
                        const result = await calculateDistanceAndETA(
                            { lat: currentUser.lat, lng: currentUser.lng },
                            { lat: targetUser.lat, lng: targetUser.lng },
                            targetUser.mode || 'car' // Use the target's mode for an accurate ETA
                        );
                        // Store the calculated distance and ETA on the target user's object.
                        targetUser.distance = result.distance;
                        targetUser.eta = result.duration;
                    } catch (error) {
                        // If the API fails, set placeholder values.
                        console.error("API Error calculating distance:", error.message);
                        targetUser.distance = 'N/A';
                        targetUser.eta = 'N/A';
                    }
                }
            })
        );
    
        // 3. After all calculations are complete, use our consistent helper function
        //    to format the data and broadcast the complete, updated user list to everyone.
        io.to(roomId).emit('locationUpdate', buildUsersObject(roomId));
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