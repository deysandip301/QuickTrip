// routes/api.js
// Defines the API endpoints for the application.

import express from 'express';
import { tripExperience } from '../controllers/tripController.js';

const router = express.Router();

// The main endpoint for generating a journey.
// It accepts a POST request with user preferences in the body.
router.post('/trip', tripExperience);

export default router;
