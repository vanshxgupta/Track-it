const express=require("express")
const cors=require("cors");
const http=require("http");
const {Server}=require("socket.io");
const {handleSocketConnection}=require("./socketHandlers");
const locationRoute=require('./routes/locationRoute')
const dotenv=require("dotenv");
dotenv.config();

const app=express();

const server=http.createServer(app);
// http.createServer(app) → creates an HTTP server and attaches your app to it.

app.use(express.json());

app.use(cors());

const io=new Server(server,{//attaches Socket.io to the server.
    cors:{
        origin:"*",
        methods:["GET","POST"],
        credentials:true,//allows cookies, auth headers, etc
    }
});

 
const PORT=process.env.PORT || 4000;


app.get('/',(req,res)=>{
    res.send("Hello from server");
});

app.use('/api/locations', locationRoute);


io.on("connection",(socket)=>{//Listens for new clients connecting to your Socket.io server.
    
    handleSocketConnection(socket,io);
    socket.on('disconnect',() => {
        console.log('User Disconnected:',socket?.id);
    })
});

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});
