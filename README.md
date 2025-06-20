# 🚀 QuickTrip - Intelligent City Guide

QuickTrip is a modern, intelligent trip planning application that uses Google Maps APIs to generate optimal city journeys based on your preferences, budget, and time constraints. It features a beautiful, responsive UI with interactive maps and location picking.

## ✨ Features

- **🗺️ Interactive Map Interface**: Plan your journey with an intuitive map-based interface
- **📍 Smart Location Picker**: Use current location or pick locations directly on the map  
- **🎯 Personalized Recommendations**: Get suggestions based on your interests (cafes, parks, museums, etc.)
- **⏰ Time & Budget Optimization**: Set your available time and budget for optimal planning
- **🚗 Route Visualization**: See your complete journey with turn-by-turn routes
- **📱 Mobile-Friendly Design**: Responsive design that works great on all devices
- **💾 Journey Saving**: Save your favorite journeys to Firebase

## 🛠️ Technology Stack

### Frontend
- **React 19** with Vite for fast development
- **Tailwind CSS** for modern, responsive styling
- **@vis.gl/react-google-maps** for advanced map functionality
- **Firebase** for data persistence

### Backend
- **Node.js** with Express server
- **Google Maps APIs** (Places, Geocoding, Distance Matrix, Directions)
- **Smart filtering** to ensure only tourist-relevant places are included
- **Fallback systems** for API quota management

## 🚦 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Google Maps API Key with the following APIs enabled:
  - Maps JavaScript API
  - Places API
  - Geocoding API
  - Distance Matrix API
  - Directions API

### Easy Setup (Windows)
1. **Run the startup script**:
   ```powershell
   # Navigate to the project directory
   cd "c:\Users\deysa\OneDrive\Desktop\QuickTrip"
   
   # Run the startup script
   .\start.ps1
   ```

This will automatically:
- Install dependencies for both frontend and backend
- Start both servers
- Open the application in your browser

### Manual Setup

1. **Clone and Install Backend**:
   ```bash
   cd server
   npm install
   ```

2. **Setup Environment Variables**:
   Create `server/.env`:
   ```env
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   PORT=5001
   CLIENT_URL=http://localhost:5173
   ```

3. **Setup Frontend**:
   ```bash
   cd client
   npm install
   ```

4. **Setup Frontend Environment**:
   Create `client/.env`:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

5. **Start Backend**:
   ```bash
   cd server
   node server.js
   ```

6. **Start Frontend**:
   ```bash
   cd client
   npm run dev
   ```

7. **Open the App**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001

## 🎯 How to Use

1. **Set Your Starting Location**:
   - Type in a city or address
   - Click "Current Location" to use your GPS location
   - Click "Pick on Map" to select a location visually

2. **Choose Your Preferences**:
   - Select what interests you (cafes, parks, museums, etc.)
   - Set your available time (1-8 hours)
   - Set your budget (₹50-₹500)

3. **Generate Your Journey**:
   - Click "🚀 Create My Journey"
   - Watch as the algorithm finds the best places for you
   - See your route visualized on the map

4. **Enjoy Your Trip**:
   - Follow the optimized route
   - Visit amazing places tailored to your preferences
   - Save your journey for future reference

## 🧠 How It Works

### Smart Place Selection
- Uses Google Places API to find relevant locations
- Filters out hotels, businesses, and non-tourist places
- Prioritizes highly-rated places that match your preferences

### Route Optimization
- Calculates optimal travel routes using Google's algorithms
- Considers time constraints and distances
- Provides realistic visit durations for each location

### Graceful Degradation
- Works even with API key restrictions
- Provides fallback options when map features are unavailable
- Robust error handling throughout the application

## 🔧 API Configuration

Your Google Maps API key needs these APIs enabled:
- **Maps JavaScript API**: For map display
- **Places API**: For finding tourist attractions
- **Geocoding API**: For address-to-coordinates conversion
- **Distance Matrix API**: For travel time calculations
- **Directions API**: For route visualization

### API Key Restrictions (Recommended)
For security, restrict your API key to:
- **HTTP referrers**: `localhost:5173`, `localhost:5001`, your domain
- **APIs**: Only the ones listed above

## 🎨 UI/UX Features

- **Modern Design**: Clean, gradient-based design with smooth animations
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Interactive Elements**: Hover effects, loading states, and smooth transitions
- **Accessibility**: Proper focus states and keyboard navigation
- **Error Handling**: User-friendly error messages and fallback states

## 🐛 Troubleshooting

### "AuthFailure" Error
- Check that your Google Maps API key is correct
- Ensure all required APIs are enabled
- Verify API key restrictions aren't too strict

### Map Not Loading
- The app will work in limited mode without maps
- Check browser console for specific error messages
- Verify network connectivity

### No Journey Results
- Try adjusting your preferences
- Increase your budget or time constraints
- Try a different starting location

## 📁 Project Structure

```
QuickTrip/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API services
│   │   └── ...
│   ├── .env               # Frontend environment variables
│   └── package.json
├── server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── services/         # Google Maps integration
│   ├── routes/           # API routes
│   ├── .env             # Backend environment variables
│   └── package.json
└── start.ps1           # Easy startup script
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

---

**🎉 Enjoy exploring your city with QuickTrip!**
