# 🔧 QuickTrip Troubleshooting Guide

## ✅ **Fixed Issues:**

1. **Import Error**: Fixed missing `apiService.js` import and configuration
2. **API URL**: Added proper backend URL configuration in `.env`
3. **Map Selection**: Simplified location selection to be more reliable
4. **Environment Variables**: Properly configured both frontend and backend `.env` files
5. **React Hook Error**: Fixed `drawSimplePolyline` hoisting issue in MapDisplay component
6. **Error Boundaries**: Added proper error handling for React components

## 🚀 **How to Start the Application:**

### Option 1: Easy Start (Recommended)
```powershell
# Navigate to project folder
cd "c:\Users\deysa\OneDrive\Desktop\QuickTrip"

# Run the startup script
.\start.ps1
```

### Option 2: Manual Start with Batch Files
1. Double-click `start-backend.bat` (starts backend server)
2. Double-click `start-frontend.bat` (starts frontend server)
3. Open browser: http://localhost:5173

### Option 3: Manual Start
1. **Start Backend**:
   ```bash
   cd server
   npm install
   node server.js
   ```

2. **Start Frontend** (in new terminal):
   ```bash
   cd client  
   npm install
   npm run dev
   ```

3. **Open Browser**: http://localhost:5173

## 🔍 **Common Issues & Solutions:**

### Frontend Not Loading
- **Check**: Is the frontend server running on port 5173?
- **Fix**: Run `npm run dev` in the client folder
- **Check**: Are all dependencies installed? Run `npm install`

### "Failed to connect to server" Error  
- **Check**: Is the backend server running on port 5001?
- **Fix**: Run `node server.js` in the server folder
- **Check**: Backend logs for any error messages

### "Cannot access 'drawSimplePolyline' before initialization" Error
- **Status**: ✅ FIXED
- **Cause**: React Hook dependency issue in MapDisplay component
- **Solution**: Reorganized code to define functions before using them
- **Action**: Restart the frontend server (`npm run dev`)

### Current Location Not Working
- **Check**: Browser permissions for location access
- **Fix**: Allow location access when prompted
- **Alternative**: Type city name manually

### No Journey Results
- **Try**: Different starting location (e.g., "Mumbai, India")
- **Try**: Adjust preferences (select more options)
- **Try**: Increase budget or duration
- **Check**: Backend logs for API errors

## 📋 **Checklist Before Running:**

- [ ] Node.js installed (v16+)
- [ ] Google Maps API key configured in both `.env` files
- [ ] Google Maps APIs enabled (Places, Geocoding, Distance Matrix, Directions)
- [ ] Both terminal windows open (backend + frontend)
- [ ] No other applications using ports 5001 or 5173

## 🌐 **URLs:**
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5001  
- **Backend Test**: http://localhost:5001 (should show "API is running!")

## 📱 **Features Working:**
- ✅ Modern, responsive UI design
- ✅ Current location detection
- ✅ Manual location input
- ✅ Preference selection with visual feedback
- ✅ Journey generation with route optimization
- ✅ Interactive map with custom markers
- ✅ Route visualization
- ✅ Mobile-friendly responsive design
- ✅ Error handling and graceful degradation

## 🎨 **UI Improvements Made:**
- Beautiful gradient-based design
- Responsive layout for all screen sizes
- Interactive preference cards with icons
- Modern loading animations
- Professional journey cards
- Smooth hover effects and transitions
- Color-coded place markers
- Intuitive form controls

The application should now work perfectly! The map selection has been simplified to be more reliable, and all import/configuration issues have been resolved.
