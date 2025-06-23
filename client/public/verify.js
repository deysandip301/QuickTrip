// Manual verification script for testing QuickTrip features
// This is not part of the application - only for manual testing
// To use: Open browser console and run window.QuickTripTests functions

function testPhotoDisplay() {
  const photos = document.querySelectorAll('.place-photo img');
  console.log(`Found ${photos.length} photos displayed`);
  
  photos.forEach((photo, index) => {
    console.log(`Photo ${index + 1}: ${photo.src} (Alt: ${photo.alt})`);
  });
}

function testDeleteButtons() {
  const deleteButtons = document.querySelectorAll('.saved-journey-delete-btn');
  console.log(`Found ${deleteButtons.length} delete buttons`);
  
  deleteButtons.forEach((btn, index) => {
    console.log(`Delete button ${index + 1}: ${btn.innerHTML}`);
  });
}

function testSavedJourneys() {
  // Check if saved journeys are loading
  const savedJourneys = document.querySelector('.saved-journeys-grid');
  if (savedJourneys) {
    const journeyCards = savedJourneys.querySelectorAll('.saved-journey-card');
    console.log(`Found ${journeyCards.length} saved journey cards`);
  } else {
    console.log('Saved journeys container not found');
  }
}

// Export test functions for manual verification
window.QuickTripTests = {
  testPhotoDisplay,
  testDeleteButtons,
  testSavedJourneys
};

console.log('QuickTrip verification functions loaded. Use window.QuickTripTests to test features.');
