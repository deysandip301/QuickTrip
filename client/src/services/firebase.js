import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Validate Firebase configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase configuration is incomplete.');
}

export const signUp = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const handleSignOut = () => {
  return signOut(auth);
};

export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export const saveJourney = async (journeyData, user = null) => {
  try {
    // Validate that we have the necessary data
    if (!journeyData) {
      throw new Error('No journey data provided');
    }
    
    if (!journeyData.journey) {
      throw new Error('Journey data missing journey property');
    }    // Sanitize the journey data while preserving photos and reviews
    const sanitizedJourney = {
      ...journeyData,
      journey: journeyData.journey.map(item => {
        const sanitizedItem = {
          name: item.name || 'Unknown Location',
          vicinity: item.vicinity || '',
          types: item.types || [],
          estimatedCost: item.estimatedCost || 0,
          travelTimeMinutes: item.travelTimeMinutes || 0,
          distanceKm: item.distanceKm || 0,
          isTravelLeg: item.isTravelLeg || false,
          rating: item.rating || 0,
          placeId: item.placeId || '',
          user_ratings_total: item.user_ratings_total || 0
        };
        
        // Include placeId if available for accurate place linking
        if (item.placeId) {
          sanitizedItem.placeId = item.placeId;
        }
        
        // Only include location if it exists and is valid
        if (item.location && item.location.lat && item.location.lng) {
          sanitizedItem.location = {
            lat: Number(item.location.lat),
            lng: Number(item.location.lng)
          };
        }
        
        // Preserve photos data for rich display
        if (item.photos && Array.isArray(item.photos)) {
          sanitizedItem.photos = item.photos.map(photo => ({
            photo_reference: photo.photo_reference || '',
            width: photo.width || 0,
            height: photo.height || 0,
            url: photo.url || '',
            html_attributions: photo.html_attributions || []
          }));
        }
        
        // Preserve reviews data for rich display
        if (item.reviews && Array.isArray(item.reviews)) {
          sanitizedItem.reviews = item.reviews.map(review => ({
            author_name: review.author_name || '',
            rating: review.rating || 0,
            text: review.text || '',
            time: review.time || 0,
            relative_time_description: review.relative_time_description || ''
          }));
        }
        
        // Preserve additional rich data
        if (item.description) {
          sanitizedItem.description = item.description;
        }
        if (item.formatted_address) {
          sanitizedItem.formatted_address = item.formatted_address;
        }
        if (item.website) {
          sanitizedItem.website = item.website;
        }
        if (item.phone) {
          sanitizedItem.phone = item.phone;
        }
        if (item.opening_hours) {
          sanitizedItem.opening_hours = item.opening_hours;
        }
        
        return sanitizedItem;
      })
    };const docData = {
      createdAt: serverTimestamp(),
      journey: sanitizedJourney,
      version: '1.0', // Add version for future compatibility
      // Include summary data if available
      summary: journeyData.summary || null,
      timestamp: journeyData.timestamp || null,
      center: journeyData.center || null
    };
    
    // Add user ID if user is logged in
    if (user && user.uid) {
      docData.userId = user.uid;
      docData.userEmail = user.email;
    } else {
      // For anonymous users, add a flag
      docData.isAnonymous = true;
    }
    
    const docRef = await addDoc(collection(db, "journeys"), docData);
    return docRef.id;
  } catch (e) {
    console.error("Error saving journey: ", e);
    
    // Try local storage fallback when Firebase fails
    try {
      const localId = saveJourneyLocal(journeyData, user);
      return localId;
    } catch (localError) {
      console.error('Local storage fallback failed:', localError);
    }
    
    // More specific error handling for different Firebase errors
    if (e.code === 'permission-denied') {
      throw new Error('Permission denied. Journey saved locally as backup.');
    } else if (e.code === 'unavailable') {
      throw new Error('Firebase service is currently unavailable. Journey saved locally as backup.');
    } else if (e.code === 'failed-precondition') {
      throw new Error('Firebase configuration issue. Journey saved locally as backup.');
    } else if (e.message.includes('FIRESTORE') || e.message.includes('transport errored')) {
      throw new Error('Database connection error. Journey saved locally as backup.');
    } else if (e.message.includes('400')) {
      throw new Error('Invalid data format. Journey saved locally as backup.');
    }
    
    throw new Error('Failed to save journey. Please try again later.');
  }
};

// Fallback function to save to local storage when Firebase fails
const saveJourneyLocal = (journeyData, user = null) => {
  try {
    const localJourneys = JSON.parse(localStorage.getItem('quicktrip_journeys') || '[]');
    const newJourney = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      journey: journeyData, // Store the full journey data including photos and reviews
      userId: user?.uid || 'anonymous',
      userEmail: user?.email || 'anonymous',
      // Include summary data if available
      summary: journeyData.summary || null,
      timestamp: journeyData.timestamp || null,
      center: journeyData.center || null
    };
    
    localJourneys.unshift(newJourney);
    // Keep only last 10 journeys in local storage
    if (localJourneys.length > 10) {
      localJourneys.splice(10);
    }
    
    localStorage.setItem('quicktrip_journeys', JSON.stringify(localJourneys));
    return newJourney.id;
  } catch (error) {
    console.error('Failed to save to local storage:', error);
    throw new Error('Failed to save journey locally');
  }
};

export const getSavedJourneys = async (user) => {
  try {
    if (!user || !user.uid) {
      return [];
    }
    
    // Use a simpler query to avoid index requirements
    const q = query(
      collection(db, "journeys"),
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    const journeys = [];
    querySnapshot.forEach((doc) => {
      journeys.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by createdAt manually to avoid index requirement
    journeys.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      return bTime - aTime; // Descending order (newest first)
    });
      return journeys;  } catch (e) {
    console.warn("Firebase fetch failed:", e.message);
    throw e;
  }
};

export const deleteJourney = async (journeyId, user = null) => {
  try {
    if (!journeyId) {
      throw new Error('Journey ID is required');
    }

    // If user is logged in, delete from Firebase
    if (user && user.uid) {
      const journeyRef = doc(db, 'journeys', journeyId);
      await deleteDoc(journeyRef);
    }

    // Also remove from local storage using flexible ID matching
    try {
      const localJourneys = JSON.parse(localStorage.getItem('quicktrip_journeys') || '[]');
      
      // Filter by matching ID, timestamp, or createdAt for backward compatibility
      const updatedJourneys = localJourneys.filter(journey => {
        const journeyIdentifier = journey.id || journey.timestamp || journey.createdAt;
        return journeyIdentifier !== journeyId;
      });
      
      localStorage.setItem('quicktrip_journeys', JSON.stringify(updatedJourneys));
    } catch (error) {
      console.warn('Error updating local storage:', error);
    }

    return true;
  } catch (error) {
    console.error('Error deleting journey:', error);
    throw error;
  }
};
