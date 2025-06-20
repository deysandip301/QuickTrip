// test-distance-matrix.js - Test Distance Matrix API specifically
import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function testDistanceMatrix() {
  try {
    console.log('Testing Distance Matrix API...');
    
    // Get some sample places in Bangalore first
    const geocodeResponse = await client.geocode({
      params: { address: 'Bangalore, India', key: API_KEY },
    });
    const center = geocodeResponse.data.results[0].geometry.location;
    
    // Get a few cafes
    const placesResponse = await client.placesNearby({
      params: {
        location: center,
        radius: 5000,
        type: 'cafe',
        key: API_KEY,
      },
    });
    
    const places = placesResponse.data.results.slice(0, 3); // Take first 3 places
    console.log(`Got ${places.length} sample places`);
    
    // Test Distance Matrix
    const origins = places.map(p => ({ place_id: p.place_id }));
    console.log('Testing with place IDs:', origins.map(o => o.place_id));
    
    const distanceResponse = await client.distancematrix({
      params: {
        origins,
        destinations: origins,
        mode: 'driving',
        key: API_KEY,
      },
    });
    
    console.log('✅ Distance Matrix Success!');
    console.log('Status:', distanceResponse.status);
    console.log('Rows:', distanceResponse.data.rows.length);
    
  } catch (error) {
    console.log('❌ Distance Matrix Failed');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error_message || error.message);
    console.log('Full error data:', JSON.stringify(error.response?.data, null, 2));
  }
}

testDistanceMatrix();
