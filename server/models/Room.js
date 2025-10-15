const mongoose=require('mongoose');

const meetingpointSchema=new mongoose.Schema({
    lat:{
        type:Number,
        required:true
    },
    lng:{
        type:Number,
        required:true
    },
},{ _id: false });

const roomSchema = new mongoose.Schema({
     roomId:{
        type:String,
        required:true,
        unique:true,
        index:true
     },
     meetingPoint: {
        type: meetingpointSchema,
        required: false,
        default: null
     },
     createdAt:{
        type:Date,
        default:Date.now,
        expires: '24h',//room will be deleted after 24 hours 
     }
})

const Room=mongoose.model('Room',roomSchema);
module.exports=Room;