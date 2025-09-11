import { io } from "socket.io-client";

const socket = io(`http://localhost:4000`); //frontend socket connection with backend server.io

export const joinRoom = (roomId, name, mode) => {
    //Frontend se backend ko event bhej rahe ho (joinRoom), taki user ek particular room me join ho jaye.
    //Ab name bhi pass karenge taki backend user ka naam store kar sake.
    socket.emit('joinRoom', { roomId, name, mode });
}

export const emitLocationUpdate = (data) => {
    //Frontend apna location data backend ko bhejta hai.
    socket.emit("locationUpdate", data);
}

export const listenforUsersUpdates = (callback) => {
    //Frontend backend ke events sunega (jaise koi user offline hua ya location update hui).

    socket.on("locationUpdate", (data) => {
        callback(data); 
        //callback(data) → is case mein callback setusers hai, jo React ka state updater hai 
        //→ iska matlab UI ko turant update kar do latest users list ke saath.
    });

    socket.on("user-offline", (data) => {
        callback(data); 
        //Ye tab chalega jab koi user disconnect ho jaye → UI update hoga accordingly.
    });
}

export default socket;
