// test-places-types.js - Test specific place types
import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function testSpecificTypes() {
  console.log('Testing specific place types from your request...');
  
  // First get Bangalore coordinates
  const geocodeResponse = await client.geocode({
    params: { address: 'Bangalore, India', key: API_KEY },
  });
  const center = geocodeResponse.data.results[0].geometry.location;
  console.log('Bangalore coordinates:', center);
  
  // Test each type individually
  const typesToTest = ['cafe', 'park', 'tourist_attraction'];
  
  for (const type of typesToTest) {
    try {
      console.log(`\nTesting type: ${type}`);
      const response = await client.placesNearby({
        params: {
          location: center,
          radius: 5000,
          type: type,
          key: API_KEY,
        },
      });
      console.log(`✅ ${type}: Found ${response.data.results.length} places`);
    } catch (error) {
      console.log(`❌ ${type}: Error -`, error.response?.data?.error_message || error.message);
      console.log('Status:', error.response?.status);
      console.log('Full error:', error.response?.data);
    }
  }
}

testSpecificTypes();
