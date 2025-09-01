const express=require('express');
const router=express.Router();

const {getRoute,calculateDistanceAndETA}=require('../controllers/locationcontroller.js')

//Route to get the route betwee two locations
router.post('/route',getRoute);

module.exports=router;