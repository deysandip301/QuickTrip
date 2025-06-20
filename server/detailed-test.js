// detailed-test.js - More comprehensive API testing
import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

console.log('=== Google Maps API Detailed Test ===');
console.log('API Key exists:', !!API_KEY);
console.log('API Key length:', API_KEY?.length);
console.log('API Key starts with:', API_KEY?.substring(0, 15));

// Test 1: Simple Geocoding
async function testGeocoding() {
  console.log('\n--- Test 1: Geocoding API ---');
  try {
    const response = await client.geocode({
      params: { 
        address: 'New York, USA', 
        key: API_KEY 
      },
    });
    console.log('✅ Geocoding Success! Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Geocoding Failed');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error_message || error.message);
    return false;
  }
}

// Test 2: Places API
async function testPlaces() {
  console.log('\n--- Test 2: Places API ---');
  try {
    const response = await client.placesNearby({
      params: {
        location: { lat: 40.7128, lng: -74.0060 }, // New York coordinates
        radius: 1000,
        type: 'restaurant',
        key: API_KEY,
      },
    });
    console.log('✅ Places Success! Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Places Failed');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error_message || error.message);
    return false;
  }
}

// Test 3: Simple HTTP request to check API key validity
async function testDirectHTTP() {
  console.log('\n--- Test 3: Direct HTTP Request ---');
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=New+York&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('HTTP Status:', response.status);
    console.log('Response status:', data.status);
    
    if (data.status === 'OK') {
      console.log('✅ Direct HTTP Success!');
      return true;
    } else {
      console.log('❌ Direct HTTP Failed');
      console.log('Error message:', data.error_message);
      return false;
    }
  } catch (error) {
    console.log('❌ Direct HTTP Error:', error.message);
    return false;
  }
}

async function runAllTests() {
  const results = [];
  
  results.push(await testGeocoding());
  results.push(await testPlaces());
  results.push(await testDirectHTTP());
  
  console.log('\n=== Test Summary ===');
  console.log('Geocoding:', results[0] ? '✅' : '❌');
  console.log('Places:', results[1] ? '✅' : '❌');
  console.log('Direct HTTP:', results[2] ? '✅' : '❌');
  
  if (results.every(r => r)) {
    console.log('\n🎉 All tests passed! API is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check Google Cloud Console settings.');
  }
}

runAllTests();
