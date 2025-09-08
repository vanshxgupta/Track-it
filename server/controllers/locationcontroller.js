// server/controllers/locationcontroller.js
const axios = require('axios');
const User = require('../models/User');

// Update user location
exports.updateLocation = async (req, res) => {
  const { userId, lat, lng } = req.body;

  try {
    // update coordinates field (nested object)
    const user = await User.findByIdAndUpdate(
      userId,
      { coordinates: { lat, lng } },
      { new: true }
    );
    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating location:', error.message);
    res.status(500).json({ message: 'Error updating location', error });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Error fetching users', error });
  }
};

// CALCULATING THE DISTANCE AND DURATION
exports.calculateDistanceAndETA = async (origin, destination, mode = 'car') => {
  const apikey = process.env.ORS_api_key;

  let profile;
  if (mode === 'car') profile = 'driving-car';
  else if (mode === 'walk') profile = 'foot-walking';
  else throw new Error("Invalid mode! Use 'car' or 'walk'.");

  const url = `https://api.openrouteservice.org/v2/matrix/${profile}`;

  try {
    const response = await axios.post(
      url,
      {
        locations: [
          [origin.lng, origin.lat],       // origin
          [destination.lng, destination.lat] // destination (fixed spelling)
        ],
        metrics: ['distance', 'duration'],
        units: 'km'
      },
      {
        headers: {
          Authorization: apikey,
          'Content-Type': 'application/json'
        }
      }
    );

    const distance = response.data.distances[0][1]; // distance in km
    const duration = response.data.durations[0][1]; // duration in seconds

    return {
      mode,
      distance: `${distance.toFixed(2)} km`,
      duration: `${Math.round(duration / 60)} mins`
    };
  } catch (error) {
    console.error('Error in calculateDistanceAndETA:', error.response?.data || error.message);
    throw error;
  }
};

// GET ROUTE between two points
exports.getRoute = async (req, res) => {
  const { start, end, mode } = req.body;
  const apikey = process.env.ORS_api_key;

  let profile;
  if (mode === 'car') profile = 'driving-car';
  else if (mode === 'walk') profile = 'foot-walking';
  else {
    profile = 'driving-car'; // default fallback
    console.warn("Invalid mode provided. Defaulting to 'car'.");
  }

  const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

  try {
    const response = await axios.post(
      url,
      {
        coordinates: [
          [start.lng, start.lat],
          [end.lng, end.lat]
        ]
      },
      {
        headers: {
          Authorization: apikey,
          'Content-Type': 'application/json'
        }
      }
    );

    // return GeoJSON route
    res.json({ route: response.data });
  } catch (error) {
    console.error('Error getting route:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to get route' });
  }
};
