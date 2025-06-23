// server.js
// Main entry point for the backend Express server.

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import apiRoutes from './routes/api.js';
import { testGoogleMapsAPI } from './services/googleMapsService.js';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Middleware setup
// Enable Cross-Origin Resource Sharing (CORS) to allow requests from the frontend
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173', // Local development
  'http://localhost:3000'  // Alternative local port
].filter(Boolean);

app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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
