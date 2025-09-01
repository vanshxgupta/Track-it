const axios = require('axios');


//CALCULATING THE DISTANCE AND DURATION
exports.calculateDistanceAndETA = async (origin, destination, mode = 'car') => {
    const apikey = process.env.ORS_api_key;

    // profile select car/walk ke liye
    let profile;
    if (mode === 'car') profile = 'driving-car';
    else if (mode === 'walk') profile = 'foot-walking';
    else throw new Error("Invalid mode! Use 'car' or 'walk'.");

    // API endpoint
    const url = `https://api.openrouteservice.org/v2/matrix/${profile}`;

    try {
        const response = await axios.post(url, {
            locations: [
                [origin.lng, origin.lat],                // origin
                [destinatison.lng, destination.lat]       // destination
            ],
            metrics: ['distance', 'duration'],          // kya chahiye
            units: 'km'                                 // distance km me
        }, {
            headers: {
                'Authorization': apikey,                  // API key
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


exports.getRoute = async (req, res) => {
    const { start, end, mode } = req.body;
    const apikey = process.env.ORS_api_key;

    let profile;
    if (mode === 'car') profile = 'driving-car';
    else if (mode === 'walk') profile = 'foot-walking';
    else return res.status(400).json({ error: "Invalid mode! Use 'car' or 'walk'." });

    // Correct Directions API
    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

    try {
        const response = await axios.post(url, {
            coordinates: [
                [start.lng, start.lat],
                [end.lng, end.lat]
            ]
        }, {
            headers: {
                'Authorization': apikey,
                'Content-Type': 'application/json'
            }
        });

        res.json({
            route: response.data, // full geojson route
        });

    } catch (error) {
        console.error('Error getting route:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to get route' });
    }
};

