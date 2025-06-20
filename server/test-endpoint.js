// test-endpoint.js - Test the actual /api/trip endpoint
const testData = {
  "location": "Bangalore, India",
  "preferences": {
    "cafe": true,
    "park": true,
    "museum": false,
    "art_gallery": false,
    "tourist_attraction": true
  },
  "duration": 240,
  "budget": 100
};

async function testTripEndpoint() {
  try {
    console.log('Testing /api/trip endpoint...');
    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:5001/api/trip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    console.log('Response status text:', response.statusText);
    
    const responseData = await response.json();
    console.log('Response data:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('✅ Endpoint test successful!');
    } else {
      console.log('❌ Endpoint test failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testTripEndpoint();
