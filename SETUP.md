# 🚀 QuickTrip Setup Guide

## 📋 Prerequisites

- Node.js (v16 or higher) - [Download here](https://nodejs.org/)
- Git - [Download here](https://git-scm.com/)
- Google Cloud Account for Maps API - [Get started here](https://cloud.google.com/)

## 🔑 Google Maps API Setup

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Note your project ID

2. **Enable Required APIs**:
   - Go to "APIs & Services" > "Library"
   - Enable these APIs:
     - ✅ Maps JavaScript API
     - ✅ Places API
     - ✅ Geocoding API  
     - ✅ Distance Matrix API
     - ✅ Directions API

3. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy your API key (keep it safe!)

4. **Secure Your API Key** (Recommended):
   - Click on your API key to edit it
   - Under "Application restrictions":
     - Select "HTTP referrers"
     - Add: `localhost:5173/*`, `localhost:5001/*`, `your-domain.com/*`
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose only the APIs you enabled above

## ⚡ Quick Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/QuickTrip.git
   cd QuickTrip
   ```

2. **Setup Backend**:
   ```bash
   cd server
   cp .env.example .env
   # Edit .env file and add your Google Maps API key
   npm install
   ```

3. **Setup Frontend**:
   ```bash
   cd ../client
   cp .env.example .env
   # Edit .env file and add your Google Maps API key
   npm install
   ```

4. **Start the Application**:
   
   **Option A - Easy Start (Windows)**:
   ```bash
   # From project root
   .\start.ps1
   ```
   
   **Option B - Manual Start**:
   ```bash
   # Terminal 1 - Backend
   cd server
   node server.js
   
   # Terminal 2 - Frontend  
   cd client
   npm run dev
   ```

5. **Open in Browser**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001

## 🔧 Environment Variables

### Server (.env)
```env
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
PORT=5001
CLIENT_URL=http://localhost:5173
```

### Client (.env)
```env
VITE_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
VITE_API_URL=http://localhost:5001/api
```

## 🚨 Security Notice

- ⚠️ **NEVER** commit your `.env` files to Git
- ⚠️ **NEVER** share your API keys publicly
- ✅ Always use `.env.example` files for reference
- ✅ Restrict your API keys to specific domains
- ✅ Monitor your API usage in Google Cloud Console

## 🐛 Troubleshooting

### API Key Issues
- **Error**: "AuthFailure" in map
- **Solution**: Check that your API key is correct and has all required APIs enabled

### Backend Connection Issues  
- **Error**: "Failed to connect to server"
- **Solution**: Make sure backend is running on port 5001

### No Journey Results
- **Try**: Different starting location (e.g., "Mumbai, India")
- **Try**: Adjust preferences and budget settings

### For more help, see: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

## 📁 Project Structure

```
QuickTrip/
├── client/              # React frontend
│   ├── src/
│   ├── .env.example     # Frontend environment template
│   └── package.json
├── server/              # Node.js backend  
│   ├── services/
│   ├── .env.example     # Backend environment template
│   └── package.json
├── start.ps1           # Easy startup script
└── README.md           # This file
```

## 🎨 Features

- 🗺️ Interactive map with route visualization
- 📍 Smart location selection (GPS + manual input)
- 🎯 Personalized recommendations based on preferences
- ⏰ Time and budget optimization
- 📱 Mobile-responsive design
- 🚗 Turn-by-turn route directions
- 💾 Journey saving capabilities

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

**Enjoy exploring your city with QuickTrip! 🎉**
