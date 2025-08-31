const axios = require('axios');


//CALCULATING THE DISTANCE AND DURATION
exports.calculateDistanceAndETA = async (origin, destination, mode = 'car') => {
    const apikey = process.env.ORS_api_key;

    // profile select car/walk ke liye
    let profile;
    if (mode === 'car') profile = 'driving-car';
    else if (mode === 'walk' || mode === 'walking') profile = 'foot-walking';
    else throw new Error("Invalid mode! Use 'car' or 'walking'.");

    // API endpoint
    const url = `https://api.openrouteservice.org/v2/matrix/${profile}`;

    try {
        const response = await axios.post(url, {
            locations: [
                [origin.lng, origin.lat],                // origin
                [destination.lng, destination.lat]       // destination
            ],
            metrics: ['distance', 'duration'],          // kya chahiye
            units: 'km'                                 // distance km me
        }, {
            headers: {
                Authorization: apikey,                  // API key
                'Content-Type': 'application/json'
            }
        });

        const distance = response.data.distances[0][1]; // km
        const duration = response.data.durations[0][1]; // seconds

        return {
            mode, // car ya walking
            distance: `${distance.toFixed(2)} km`,
            duration: `${Math.round(duration / 60)} mins` // mins
        };

    } catch (error) {
        console.error('Error in calculateDistanceAndETA:', error);
        throw error;
    }
};
