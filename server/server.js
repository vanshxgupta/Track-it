const express=require("express")
const cors=require("cors");

const app=express();
app.use(express.json());

app.use(cors());

const http=require("http");
const {Server}=require("socket.io");

const server=http.createServer(app);
// http.createServer(app) → creates an HTTP server and attaches your app to it.


const io=new Server(server,{//attaches Socket.io to the server.
    cors:{
        origin:"*",
        methods:["GET","POST"],
        credentials:true,//allows cookies, auth headers, etc
    }
});


const PORT=process.env.PORT || 4000;


app.get('/',(req,res)=>{
    res.send("Hello World");
});

// app.use('/api/locations', (req, res) => {
//     res.send("Locations API");
// });


io.on("connection",(socket)=>{//Listens for new clients connecting to your Socket.io server.
    console.log(`User connected: ${socket?.id}`);//Each client (frontend) that connects gets a unique socket.id.

    handleSocketConnection(socket,io);
    socket.on('disconnect',() => {
        console.log('User Disconnected:',socket?.id);
    })
});

server.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
});
