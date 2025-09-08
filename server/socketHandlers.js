const { Socket } = require("socket.io");
const { calculateDistanceAndETA } = require('./controllers/locationcontroller'); 

let roomUsers={};
//roomUsers ek object hai jisme har room ke andar kaunsa user hai aur unki location store hogi.
// {
//   "room1": {
//      "socketId1": { name: "User1", lat: 23.45, lng: 77.11 },
//      "socketId2": { name: "User2", lat: 22.11, lng: 78.44 }
//   },
//   "room2": {
//      "socketId3": { name: "User3", lat: 19.07, lng: 72.87 }
//   }
// }

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
            distance: u.distance ?? null,
            eta: u.eta ?? null,
        };
    });
    return usersObj;
}

const handleSocketConnection=(socket,io)=>{//Jab bhi koi naya client connect hota hai to ye function chalega.

    console.log('A user connected:',socket?.id);

    socket.on('joinRoom',({roomId,name})=>{
        socket.join(roomId); // is user ko ek specific room me daal diya
        socket.roomId=roomId; //set the roomId on the socket object for later use
        
        if(!roomUsers[roomId]){
            roomUsers[roomId]={}; //if room doesn't exist , create a empty object
        }
        // room ke andar user ko add kar diya, name bhi save kar liya
        roomUsers[roomId][socket.id]={ name: name || "Anon", lat: null, lng: null };

        // update sabko
        io.to(roomId).emit('locationUpdate', buildUsersObject(roomId));
    });

    socket.on('locationUpdate',async(data) => {

        const {lat,lng,mode}=data;
        const roomId=socket.roomId;

        if(!roomId) return ;

        // update the location of user
        if (!roomUsers[roomId][socket.id]) roomUsers[roomId][socket.id] = {};
        roomUsers[roomId][socket.id].lat = lat;
        roomUsers[roomId][socket.id].lng = lng;

        const me = roomUsers[roomId][socket.id];
        const usersObj = buildUsersObject(roomId);

        //Calculate distance and ETA(estimated time of arrival) relative to "me"
        if (me.lat != null && me.lng != null) {
            await Promise.all(
                Object.keys(roomUsers[roomId]).map(async (id) => {
                    if (id === socket.id) {
                        usersObj[id].distance = "0 km";
                        usersObj[id].eta = "0 mins";
                        return;
                    }
                    const other = roomUsers[roomId][id];
                    if (other.lat == null || other.lng == null) {
                        usersObj[id].distance = null;
                        usersObj[id].eta = null;
                        return;
                    }
                    try {
                        const result = await calculateDistanceAndETA(
                            { lat: other.lat, lng: other.lng },
                            { lat: me.lat, lng: me.lng },
                            mode || 'car'
                        );
                        usersObj[id].distance = result.distance;
                        usersObj[id].eta = result.duration;
                    } catch {
                        usersObj[id].distance = "N/A";
                        usersObj[id].eta = "N/A";
                    }
                })
            );
        }

        io.to(roomId)//Ye socket.io ka function hai jo sirf ek particular room me message bhejta hai.
        .emit('locationUpdate', usersObj);
     
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
