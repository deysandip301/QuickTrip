// services/apiService.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const tripJourney = async (params) => {
  try {
    const response = await fetch(`${API_URL}/trip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch journey.');
    }

    return data;
  } catch (error) {
    console.error('API Service Error:', error);
    throw new Error(error.message || 'Failed to connect to the server. Please ensure the backend is running.');
  }
};
