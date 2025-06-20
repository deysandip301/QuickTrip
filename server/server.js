// server.js
// Main entry point for the backend Express server.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { testGoogleMapsAPI } from './services/googleMapsService.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware setup
// Enable Cross-Origin Resource Sharing (CORS) to allow requests from the frontend
app.use(cors({ origin: process.env.CLIENT_URL }));
// Enable parsing of JSON request bodies
app.use(express.json());

// Define the main API route
app.use('/api', apiRoutes);

// A simple root route to check if the server is running
app.get('/', (req, res) => {
  res.send('Urban Experience Weaver API is running!');
});

// Start the server and listen for incoming requests
app.listen(PORT, async () => {
  console.log(`Server is listening on port ${PORT}`);
  
  // Test Google Maps API on startup
  await testGoogleMapsAPI();
});
