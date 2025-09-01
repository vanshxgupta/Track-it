import { io } from "socket.io-client";

const socket=io(`http://localhost:4000`);//frontend socket connection with backend server.io

export const joinRoom=(roomId)=>{//Frontend se backend ko event bhej rahe ho (joinRoom), taki user ek particular room me join ho jaye.
    socket.emit("joinRoom",roomId);
}

export const emitLocationUpdate=(data)=>{//Frontend apna location data backend ko bhejta hai.
    socket.emit("locationUpdate",data);
}

export const listenforUsersUpdates=(callback)=>{//Frontend backend ke events sunega (jaise koi user offline hua).
    socket.on("user-offline", (data) => {
        callback(data); 
    });
}

export default socket;