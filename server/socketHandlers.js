const { Socket } = require("socket.io");

let roomUsers={};
//roomUsers ek object hai jisme har room ke andar kaunsa user hai aur unki location store hogi.
// {
//   "room1": {
//     "socketId1": { lat: 23.45, lng: 77.11 },
//     "socketId2": { lat: 22.11, lng: 78.44 }
//   },
//   "room2": {
//     "socketId3": { lat: 19.07, lng: 72.87 }
//   }
// }


const handleSocketConnection=(socket,io)=>{//Jab bhi koi naya client connect hota hai to ye function chalega.

    console.log('A user connected:',socket?.id);


    socket.on('joinRoom',(roomId)=>{
        socket.join(roomId); // is user ko ek specific room me daal diya
        socket.roomId=roomId; //set the roomId on the socket object for later use
        
        if(!roomUsers[roomId]){
            roomUsers[roomId]={}; //if room doesn't exist , create a empty object
        }
        roomUsers[roomId][socket.id]={}; // room ke andar user ko add kar diya

    })


    socket.on('locationUpdate',async(data) => {

        const {lat,lng}=data;
        const roomId=socket.roomId;

        if(!roomId) return ;

        roomUsers[roomId][socket.id]={lat,lng};//update the location of user


        //Calculate distance and ETA(estimated time of arrival) for all Room users
        const updatedUsers = await Promise.all(
            //Promise.all([...]) ->// Matlab: saare .map() ke andar jo promises return ho rahe hain, unko parallel run kar do.

            Object.keys(users).map(async (id) => {
                //har ek user ka har ek user se distance or time niklega ->just like smjho cross join kar rahe hai 
                let distance = null, duration = null;
                // Find the "me" user for each client
                if (users[socket.id] && users[id]) {
                    try {
                        if (id !== socket.id){//because distance and duration of user with itself niklne ki jrurt nahi hai
                            const result = await calculateDistanceAndETA(users[id], users[socket.id]);//->iska controller bnao ab ek 
                            distance = result.distance;
                            duration = result.duration;
                        }
                    } catch {
                        distance = 'N/A';
                        duration = 'N/A';
                    }
                }
                return {
                    userId: id,
                    lat: users[id]?.lat,
                    lng: users[id]?.lng,
                    distance,
                    eta: duration,
                };
            })
        );

        io.to(roomId)//Ye socket.io ka function hai jo sirf ek particular room me message bhejta hai.
        .emit('user-offline', updatedUsers);

          
    })
}