// test-api.js - Quick test for Google Maps API
import { Client } from '@googlemaps/google-maps-services-js';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

console.log('Testing Google Maps API...');
console.log('API Key exists:', !!API_KEY);
console.log('API Key (first 10 chars):', API_KEY?.substring(0, 10));

async function testAPI() {
  try {
    console.log('Testing geocoding for Bangalore, India...');
    const response = await client.geocode({
      params: { 
        address: 'Bangalore, India', 
        key: API_KEY 
      },
    });
    
    console.log('Success! Status:', response.status);
    console.log('Results found:', response.data.results.length);
    if (response.data.results.length > 0) {
      console.log('Location:', response.data.results[0].geometry.location);
    }
  } catch (error) {
    console.error('API Test Failed!');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Data:', error.response.data);
    }
  }
}

testAPI();
